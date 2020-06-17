use std::borrow::Cow;
use std::sync::Arc;

use bitcoin_cash::{
    encoding_utils::{encode_bool, encode_int, vec_to_int},
    Function, Hashed, Integer, Op, Opcode, Ops, Script, SigHashFlags, StackItemData,
    StackItemDelta, TaggedOp, Tx,
};
use bitcoin_cash::{error, ByteArray, Hash160, Ripemd160, Sha1, Sha256, Sha256d, ECC};
use std::convert::TryInto;

pub struct ScriptInterpreter<E: ECC> {
    stack: Vec<StackItem>,
    alt_stack: Vec<StackItem>,
    tx: Arc<Tx>,
    lock_script: Script,
    instruction_pointer: usize,
    exec_stack: Vec<bool>,
    ecc: Arc<E>,
    input_idx: usize,
}

#[derive(Clone, Debug)]
pub enum ScriptError {
    InvalidPubKey(ByteArray),
    InvalidSignatureFormat(ByteArray),
    InvalidSignature(ByteArray, ByteArray),
    EqualVerifyFailed(ByteArray, ByteArray),
    VerifyFailed,
    NotImplemented,
    ScriptFinished,
    InvalidDataType,
    StackEmpty,
    OpcodeMsg(Opcode, Cow<'static, str>),
    UnbalancedConditionals(Opcode),
    InvalidOpcode(u8),
    InvalidDepth(Integer),
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct StackItem {
    pub data: StackItemData,
    pub name: Option<Arc<Cow<'static, str>>>,
    pub delta: StackItemDelta,
}
impl StackItem {
    pub fn to_bool(&self) -> bool {
        match self.data {
            StackItemData::Integer(int) => int != 0,
            StackItemData::Boolean(boolean) => boolean,
            StackItemData::ByteArray(ref array) => array.len() > 0,
        }
    }
}

impl<E: ECC> ScriptInterpreter<E> {
    pub fn new(tx: Arc<Tx>, input_idx: usize, ecc: Arc<E>) -> Self {
        ScriptInterpreter {
            stack: Vec::new(),
            alt_stack: Vec::new(),
            instruction_pointer: 0,
            lock_script: tx.inputs()[input_idx]
                .lock_script
                .clone()
                .expect("Input must have lock_script"),
            tx,
            input_idx,
            exec_stack: Vec::new(),
            ecc,
        }
    }

    fn pop(&mut self) -> Result<StackItem, ScriptError> {
        if let Some(item) = self.stack.pop() {
            return Ok(item);
        }
        return Err(ScriptError::StackEmpty);
    }

    fn pop_bool(&mut self) -> Result<bool, ScriptError> {
        match self.pop()?.data {
            StackItemData::ByteArray(_) => Err(ScriptError::InvalidDataType),
            StackItemData::Integer(int) => Ok(int != 0),
            StackItemData::Boolean(boolean) => Ok(boolean),
        }
    }

    fn pop_int(&mut self) -> Result<Integer, ScriptError> {
        match self.pop()?.data {
            StackItemData::ByteArray(_) => Err(ScriptError::InvalidDataType),
            StackItemData::Integer(int) => Ok(int),
            StackItemData::Boolean(boolean) => Ok(if boolean { 1 } else { 0 }),
        }
    }

    fn pop_byte_array(&mut self) -> Result<ByteArray, ScriptError> {
        match self.pop()?.data {
            StackItemData::ByteArray(byte_array) => Ok(byte_array),
            StackItemData::Integer(int) => Ok(encode_int(int).into()),
            StackItemData::Boolean(boolean) => Ok(encode_bool(boolean).into()),
        }
    }

    pub fn run(&mut self) -> Result<bool, ScriptError> {
        while !self.is_finished() {
            self.run_next_op()?;
        }
        Ok(self.stack[0].to_bool())
    }

    pub fn push_input_data(&mut self) -> Result<(), ScriptError> {
        let input_script = Arc::clone(self.tx.inputs()[self.input_idx].script.ops_arc());
        for op in &input_script[..input_script.len() - 1] {
            self.run_op(op)?;
        }
        Ok(())
    }

    pub fn is_finished(&self) -> bool {
        self.instruction_pointer >= self.lock_script.ops().len()
    }

    pub fn instruction_pointer(&self) -> usize {
        self.instruction_pointer
    }

    pub fn run_next_op(&mut self) -> Result<(), ScriptError> {
        if self.instruction_pointer >= self.lock_script.ops().len() {
            return Err(ScriptError::ScriptFinished);
        }
        let ops = Arc::clone(self.lock_script.ops_arc());
        self.run_op(&ops[self.instruction_pointer])?;
        self.instruction_pointer += 1;
        Ok(())
    }

    pub fn stack(&self) -> &[StackItem] {
        &self.stack
    }

    pub fn alt_stack(&self) -> &[StackItem] {
        &self.alt_stack
    }

    pub fn exec_stack(&self) -> &[bool] {
        &self.exec_stack
    }

    fn push_tagged_data(&mut self, op: &TaggedOp, data: StackItemData) {
        self.push_tagged_data_idx(op, data, 0);
    }

    fn push_tagged_data_idx(&mut self, op: &TaggedOp, mut data: StackItemData, idx: usize) {
        let name = op
            .pushed_names
            .as_ref()
            .and_then(|names| names.get(idx).cloned())
            .flatten()
            .map(Arc::new);
        if let StackItemData::ByteArray(array) = data {
            data = StackItemData::ByteArray(array.named_option(name.clone()));
        }
        let delta = match &op.op {
            Op::Code(opcode) => *opcode.behavior().delta.get(idx).unwrap_or(&StackItemDelta::Removed),
            Op::PushBoolean(_) | Op::PushByteArray { .. } | Op::PushInteger(_) => {
                StackItemDelta::Added
            }
            Op::Invalid(_) => StackItemDelta::Untouched,
        };
        self.stack.push(StackItem { data, name, delta })
    }

    fn run_op(&mut self, op: &TaggedOp) -> Result<(), ScriptError> {
        self.stack
            .iter_mut()
            .for_each(|stack| stack.delta = StackItemDelta::Untouched);

        let is_executed = self.exec_stack.iter().all(|&x| x);
        use Opcode::*;
        if let Op::Code(OP_IF) | Op::Code(OP_ELSE) | Op::Code(OP_ENDIF) = &op.op {
        } else {
            if !is_executed {
                return Ok(());
            }
        }
        match op.op {
            Op::PushBoolean(data) => {
                self.push_tagged_data(op, StackItemData::Boolean(data));
                Ok(())
            }
            Op::PushInteger(data) => {
                self.push_tagged_data(op, StackItemData::Integer(data));
                Ok(())
            }
            Op::PushByteArray { ref array, .. } => {
                self.push_tagged_data(op, StackItemData::ByteArray(array.clone()));
                Ok(())
            }
            Op::Code(code) => self.run_opcode(op, code, is_executed),
            Op::Invalid(code) => Err(ScriptError::InvalidOpcode(code)),
        }
    }

    fn pop_depth_to_idx(&mut self) -> Result<usize, ScriptError> {
        let depth = self.pop_int()?;
        let depth = depth.try_into().map_err(|_| ScriptError::InvalidDepth(depth))?;
        self.stack.len()
            .checked_sub(depth)
            .and_then(|x| x.checked_sub(1))
            .ok_or(ScriptError::InvalidDepth(depth as Integer))
    }

    fn run_opcode(
        &mut self,
        op: &TaggedOp,
        opcode: Opcode,
        is_executed: bool,
    ) -> Result<(), ScriptError> {
        use self::ScriptError::*;
        use Opcode::*;

        match opcode {
            OP_PICK => {
                let item_idx = self.pop_depth_to_idx()?;
                let mut item = self.stack[item_idx].clone();
                item.delta = StackItemDelta::Added;
                self.stack.push(item);
            }
            OP_ROLL => {
                let item_idx = self.pop_depth_to_idx()?;
                self.stack[item_idx..]
                    .iter_mut()
                    .for_each(|item| item.delta = StackItemDelta::MovedIndirectly);
                let mut item = self.stack.remove(item_idx);
                item.delta = StackItemDelta::Moved;
                self.stack.push(item);
            }
            OP_TOALTSTACK => {
                let top = self.stack.remove(self.stack.len() - 1);
                self.alt_stack.push(top);
            }
            OP_FROMALTSTACK => {
                let top = self.alt_stack.remove(self.alt_stack.len() - 1);
                self.push_tagged_data(op, top.data);
            }
            OP_CAT => {
                let first = self.pop_byte_array()?;
                let second = self.pop_byte_array()?;
                self.push_tagged_data(op, StackItemData::ByteArray(second.concat(first)));
            }
            OP_SPLIT => {
                let split_idx = self.pop_int()? as usize;
                let top = self.pop_byte_array()?;
                let (left, right) = top
                    .split(split_idx)
                    .map_err(|err| ScriptError::OpcodeMsg(OP_SPLIT, err.into()))?;
                self.push_tagged_data_idx(op, StackItemData::ByteArray(left), 0);
                self.push_tagged_data_idx(op, StackItemData::ByteArray(right), 1);
            }
            OP_NUM2BIN => {
                let n_bytes = self.pop_int()?;
                let int = self.pop_int()?;
                self.push_tagged_data(
                    op,
                    StackItemData::ByteArray(
                        ByteArray::from_int(int, n_bytes)
                            .map_err(|err| ScriptError::OpcodeMsg(OP_NUM2BIN, err.into()))?,
                    ),
                );
            }
            OP_BIN2NUM => {
                let array = self.pop_byte_array()?;
                self.push_tagged_data(op, StackItemData::Integer(vec_to_int(&array)));
            }
            OP_SIZE => {
                let array = &self.stack[self.stack.len() - 1].data;
                if let StackItemData::ByteArray(array) = array {
                    let len = array.len() as Integer;
                    self.push_tagged_data(op, StackItemData::Integer(len));
                } else {
                    return Err(ScriptError::InvalidDataType);
                }
            }
            OP_SHA1 => {
                let array = self.pop_byte_array()?;
                self.push_tagged_data(
                    op,
                    StackItemData::ByteArray(Sha1::digest(array).into_byte_array()),
                );
            }
            OP_RIPEMD160 => {
                let array = self.pop_byte_array()?;
                self.push_tagged_data(
                    op,
                    StackItemData::ByteArray(Ripemd160::digest(array).into_byte_array()),
                );
            }
            OP_HASH256 => {
                let array = self.pop_byte_array()?;
                self.push_tagged_data(
                    op,
                    StackItemData::ByteArray(Sha256d::digest(array).into_byte_array()),
                );
            }
            OP_SHA256 => {
                let array = self.pop_byte_array()?;
                self.push_tagged_data(
                    op,
                    StackItemData::ByteArray(Sha256::digest(array).into_byte_array()),
                );
            }
            OP_HASH160 => {
                let array = self.pop_byte_array()?;
                self.push_tagged_data(
                    op,
                    StackItemData::ByteArray(Hash160::digest(array).into_byte_array()),
                );
            }
            OP_EQUAL | OP_EQUALVERIFY => {
                let first = self.pop_byte_array()?;
                let second = self.pop_byte_array()?;
                let equal = &first == &second;
                if opcode == OP_EQUALVERIFY {
                    if !equal {
                        return Err(EqualVerifyFailed(first, second));
                    }
                } else {
                    self.push_tagged_data(op, StackItemData::Boolean(equal));
                }
            }
            OP_NUMEQUALVERIFY => {
                let first = self.pop_int()?;
                let second = self.pop_int()?;
                if first != second {
                    return Err(VerifyFailed);
                }
            }
            OP_NOT => {
                let boolean = self.pop_bool()?;
                self.push_tagged_data(op, StackItemData::Boolean(!boolean));
            }
            OP_GREATERTHAN => {
                let first = self.pop_int()?;
                let second = self.pop_int()?;
                self.push_tagged_data(op, StackItemData::Boolean(second > first));
            }
            OP_GREATERTHANOREQUAL => {
                let first = self.pop_int()?;
                let second = self.pop_int()?;
                self.push_tagged_data(op, StackItemData::Boolean(second >= first));
            }
            OP_LESSTHANOREQUAL => {
                let first = self.pop_int()?;
                let second = self.pop_int()?;
                self.push_tagged_data(op, StackItemData::Boolean(second <= first));
            }
            OP_LESSTHAN => {
                let first = self.pop_int()?;
                let second = self.pop_int()?;
                self.push_tagged_data(op, StackItemData::Boolean(second < first));
            }
            OP_MIN => {
                let first = self.pop_int()?;
                let second = self.pop_int()?;
                self.push_tagged_data(op, StackItemData::Integer(second.min(first)));
            }
            OP_MAX => {
                let first = self.pop_int()?;
                let second = self.pop_int()?;
                self.push_tagged_data(op, StackItemData::Integer(second.max(first)));
            }
            OP_0NOTEQUAL => {
                let top = self.pop_int()?;
                self.push_tagged_data(op, StackItemData::Boolean(top != 0));
            }
            OP_ADD => {
                let b = self.pop_int()?;
                let a = self.pop_int()?;
                self.push_tagged_data(op, StackItemData::Integer(a + b));
            }
            OP_SUB => {
                let b = self.pop_int()?;
                let a = self.pop_int()?;
                self.push_tagged_data(op, StackItemData::Integer(a - b));
            }
            OP_DIV => {
                let b = self.pop_int()?;
                let a = self.pop_int()?;
                if b == 0 {
                    return Err(ScriptError::OpcodeMsg(opcode, "Division by 0".into()));
                }
                self.push_tagged_data(op, StackItemData::Integer(a / b));
            }
            OP_MOD => {
                let b = self.pop_int()?;
                let a = self.pop_int()?;
                if b == 0 {
                    return Err(ScriptError::OpcodeMsg(opcode, "Modulo by 0".into()));
                }
                self.push_tagged_data(op, StackItemData::Integer(a % b));
            }
            OP_IF => {
                let top = if is_executed { self.pop_bool()? } else { false };
                self.exec_stack.push(top);
            }
            OP_ELSE => {
                let top_exec = self
                    .exec_stack
                    .last_mut()
                    .ok_or(ScriptError::UnbalancedConditionals(OP_ELSE))?;
                *top_exec = !*top_exec;
            }
            OP_ENDIF => {
                self.exec_stack
                    .pop()
                    .ok_or(ScriptError::UnbalancedConditionals(OP_ENDIF))?;
            }
            OP_VERIFY => {
                let top = self.pop()?;
                if !top.to_bool() {
                    return Err(VerifyFailed);
                }
            }
            OP_CHECKSIG | OP_CHECKSIGVERIFY | OP_CHECKDATASIG | OP_CHECKDATASIGVERIFY => {
                let pubkey = self.pop_byte_array()?;
                let (msg, sig_ser) = match opcode {
                    OP_CHECKSIG | OP_CHECKSIGVERIFY => {
                        let sig = self.pop_byte_array()?;
                        let mut sig_ser = sig.to_vec();
                        let sig_hash_flags =
                            [SigHashFlags::from_u8(sig_ser.remove(sig_ser.len() - 1))];
                        let preimages =
                            self.tx.preimages(&sig_hash_flags)[self.input_idx][0].to_byte_array();
                        let sig = sig.apply_function(sig_ser, Function::ToDataSig);
                        (Sha256d::digest(preimages).into_byte_array(), sig)
                    }
                    OP_CHECKDATASIG | OP_CHECKDATASIGVERIFY => {
                        let msg = Sha256::digest(self.pop_byte_array()?).into_byte_array();
                        (msg, self.pop_byte_array()?)
                    }
                    _ => unreachable!(),
                };
                let validity = match self.ecc.verify(&pubkey, &msg, &sig_ser) {
                    Ok(validity) => validity,
                    Err(error::Error(error::ErrorKind::InvalidPubkey, _)) => {
                        return Err(ScriptError::InvalidPubKey(pubkey))
                    }
                    Err(error::Error(error::ErrorKind::InvalidSignatureFormat, _)) => {
                        return Err(ScriptError::InvalidSignatureFormat(sig_ser))
                    }
                    Err(err) => return Err(ScriptError::OpcodeMsg(opcode, err.to_string().into())),
                };
                if opcode == OP_CHECKSIG || opcode == OP_CHECKDATASIG {
                    self.push_tagged_data(op, StackItemData::Boolean(true));
                } else {
                    if !validity {
                        return Err(InvalidSignature(msg, sig_ser));
                    }
                }
            }
            OP_REVERSEBYTES => {
                let array = self.pop_byte_array()?;
                let mut reversed = array.to_vec();
                reversed.reverse();
                self.push_tagged_data(
                    op,
                    StackItemData::ByteArray(array.apply_function(reversed, Function::Reverse)),
                );
            }
            OP_CODESEPARATOR => {}
            OP_CHECKLOCKTIMEVERIFY => {
                let lock_time = self.pop_int()?;
                if self.tx.lock_time() < lock_time as u32 {
                    return Err(VerifyFailed);
                }
                self.push_tagged_data(op, StackItemData::Integer(lock_time));
            }
            _ => {
                let behavior = opcode.behavior();
                let input_items = self
                    .stack
                    .drain(self.stack.len() - behavior.input_types.len()..)
                    .collect::<Vec<_>>();
                if let Some(output_order) = behavior.output_order {
                    for (&new_idx, &delta) in output_order.iter().zip(behavior.delta) {
                        self.stack.push(StackItem {
                            delta,
                            ..input_items[new_idx].clone()
                        });
                    }
                } else {
                    return Err(ScriptError::NotImplemented);
                }
            }
        };
        Ok(())
    }
}

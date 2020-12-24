use wasm_bindgen::prelude::*;
use bitcoin_cash::StackItemData;
use bitcoin_cash_ecc::{SelectedECC, init_ecc};
use crate::{TxInput, ByteArray, Op};
use std::sync::Arc;

use iguana_interpreter::ScriptInterpreter;

#[wasm_bindgen]
pub struct Interpreter {
    interpreter: ScriptInterpreter<SelectedECC>,
    input: TxInput,
}

#[wasm_bindgen]
pub struct ScriptError(iguana_interpreter::ScriptError);

#[wasm_bindgen]
pub struct Stack {
    items: Arc<[iguana_interpreter::StackItem]>,
}

#[wasm_bindgen]
pub struct StackItem {
    items: Arc<[iguana_interpreter::StackItem]>,
    idx: usize,
}

#[wasm_bindgen]
pub struct ECC(Arc<SelectedECC>);

#[wasm_bindgen]
impl ECC {
    #[wasm_bindgen(constructor)]
    pub fn new() -> ECC {
        ECC(Arc::new(init_ecc()))
    }
}

#[wasm_bindgen]
impl Interpreter {
    #[wasm_bindgen(constructor)]
    pub fn new(ecc: &ECC, input: &TxInput) -> Interpreter {
        let mut interpreter = ScriptInterpreter::new(
            input.tx(),
            input.input_idx(),
            Arc::clone(&ecc.0),
        );
        interpreter.push_input_data().expect("Could not push input data");
        Interpreter {
            interpreter,
            input: input.clone(),
        }
    }

    pub fn next(&mut self) -> Option<ScriptError> {
        self.interpreter.run_next_op().map_err(ScriptError).err()
    }

    #[wasm_bindgen(js_name = isFinished)]
    pub fn is_finished(&self) -> bool {
        self.interpreter.is_finished()
    }

    pub fn stack(&self) -> Stack {
        Stack {
            items: self.interpreter.stack().to_vec().into(),
        }
    }

    #[wasm_bindgen(js_name = altStack)]
    pub fn alt_stack(&self) -> Stack {
        Stack {
            items: self.interpreter.alt_stack().to_vec().into(),
        }
    }

    #[wasm_bindgen(js_name = execStack)]
    pub fn exec_stack(&self) -> Vec<JsValue> {
        self.interpreter.exec_stack().iter().cloned().map(Into::into).collect()
    }

    #[wasm_bindgen(js_name = instructionPointer)]
    pub fn instruction_pointer(&self) -> usize {
        self.interpreter.instruction_pointer()
    }

    #[wasm_bindgen(js_name = nextOp)]
    pub fn next_op(&self) -> Op {
        self.input.lock_script()
            .expect("Input must have lock_script")
            .op_at(self.interpreter.instruction_pointer())
    }
}

#[wasm_bindgen]
impl Stack {
    #[wasm_bindgen(js_name = numItems)]
    pub fn num_items(&self) -> usize {
        self.items.len()
    }

    #[wasm_bindgen(js_name = itemAt)]
    pub fn item_at(&self, idx: usize) -> Result<StackItem, JsValue> {
        if self.items.len() <= idx {
            Err(format!("Tried accessing item at index {}, but stack only has {} items", self.items.len(), idx))?
        }
        Ok(StackItem {
            items: Arc::clone(&self.items),
            idx,
        })
    }

    pub fn items(&self) -> Vec<JsValue> {
        (0..self.items.len()).into_iter().map(|idx| {
            StackItem {
                items: Arc::clone(&self.items),
                idx
            }.into()
        }).collect()
    }
}

impl StackItem {
    pub fn item(&self) -> &iguana_interpreter::StackItem {
        &self.items[self.idx]
    }
}

#[wasm_bindgen]
impl StackItem {
    pub fn data(&self) -> JsValue {
        match self.item().data {
            StackItemData::Integer(int) => int.value().into(),
            StackItemData::Boolean(boolean) => boolean.into(),
            StackItemData::ByteArray(ref array) => ByteArray::from_byte_array(array.clone()).into(),
        }
    }

    pub fn name(&self) -> Option<String> {
        self.item().name.as_ref().map(|name| name.to_string())
    }

    pub fn delta(&self) -> String {
        format!("{:?}", self.item().delta)
    }
}

#[wasm_bindgen]
impl ScriptError {
    pub fn title(&self) -> String {
        use iguana_interpreter::ScriptError::*;
        match &self.0 {
            InvalidPubKey(..) => "Invalid public key".to_string(),
            InvalidSignatureFormat(..) => "Invalid signature format".to_string(),
            InvalidSignature(..) => "Invalid signature".to_string(),
            EqualVerifyFailed(..) => "OP_EQUALVERIFY failed".to_string(),
            VerifyFailed => "OP_VERIFY failed".to_string(),
            NotImplemented => "Opcode not implemented".to_string(),
            ScriptFinished => "Script finished".to_string(),
            InvalidDataType => "Invalid data type for operation".to_string(),
            StackEmpty => "Stack empty".to_string(),
            OpcodeMsg(opcode, msg) => format!("{:?}: {}", opcode, msg),
            UnbalancedConditionals(..) => "Unbalanced conditionals".to_string(),
            InvalidOpcode(code) => format!("Invalid opcode: {:02x}", code),
            InvalidDepth(depth) => format!("Invalid depth: {}", depth),
            InvalidInteger(integer) => format!("Invalid integer: {}", integer),
            InvalidConversion(conversion) => format!("Invalid conversion: {}", conversion),
        }
    }

    #[wasm_bindgen(js_name = firstArray)]
    pub fn first_array(&self) -> Option<ByteArray> {
        use iguana_interpreter::ScriptError::*;
        match &self.0 {
            InvalidPubKey(array) | 
            InvalidSignatureFormat(array) | 
            InvalidSignature(array, _) | 
            EqualVerifyFailed(array, _) => Some(ByteArray::from_byte_array(array.clone())),
            _ => None,
        }
    }

    #[wasm_bindgen(js_name = secondArray)]
    pub fn second_array(&self) -> Option<ByteArray> {
        use iguana_interpreter::ScriptError::*;
        match &self.0 {
            InvalidSignature(_, array) | 
            EqualVerifyFailed(_, array) => Some(ByteArray::from_byte_array(array.clone())),
            _ => None,
        }
    }
}

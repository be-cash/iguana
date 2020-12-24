use bitcoin_cash::{TaggedOp, Opcode, serialize_op};
use wasm_bindgen::prelude::*;
use crate::ByteArray;
use std::sync::Arc;

#[wasm_bindgen]
pub struct Script {
    ops: Arc<[TaggedOp]>,
}

#[wasm_bindgen]
pub struct Op {
    ops: Arc<[TaggedOp]>,
    idx: usize,
}

fn fmt_err(err: impl std::fmt::Display) -> JsValue {
    err.to_string().into()
}

impl Script {
    pub fn new(ops: Arc<[TaggedOp]>) -> Self {
        Script { ops }
    }

    pub fn op_at(&self, idx: usize) -> Op {
        Op {
            ops: Arc::clone(&self.ops),
            idx,
        }
    }
}

#[wasm_bindgen]
impl Script {
    pub fn ops(&self) -> Vec<JsValue> {
        self.ops.iter()
            .enumerate()
            .map(|(idx, _)| Op {
                ops: Arc::clone(&self.ops),
                idx,
            }.into())
            .collect()
    }
}

impl Op {
    fn tagged_op(&self) -> &TaggedOp {
        &self.ops[self.idx]
    }
}

#[wasm_bindgen]
impl Op {
    pub fn data(&self) -> JsValue {
        use bitcoin_cash::Op::*;
        match self.tagged_op().op {
            Code(code) => format!("{:?}", code).into(),
            Invalid(code) => format!("INVALID_{}", code).into(),
            PushByteArray { ref array, .. } => ByteArray::from_byte_array(array.clone()).into(),
            PushBoolean(boolean) => boolean.into(),
            PushInteger(int) => int.value().into(),
        }
    }

    pub fn name(&self) -> String {
        use bitcoin_cash::Op::*;
        match self.tagged_op().op {
            Code(..) => "code",
            Invalid(..) => "invalid",
            PushByteArray {..} => "bytearray",
            PushBoolean(..) => "bool",
            PushInteger(..) => "int",
        }.to_string()
    }

    #[wasm_bindgen(js_name = isPushOp)]
    pub fn is_push_op(&self) -> bool {
        use bitcoin_cash::Op::*;
        match self.tagged_op().op {
            Code(opcode) => opcode as u8 <= Opcode::OP_16 as u8,
            Invalid(..) => false,
            PushByteArray {..} => true,
            PushBoolean(..) => true,
            PushInteger(..) => true,
        }
    }

    #[wasm_bindgen(js_name = byteSize)]
    pub fn byte_size(&self) -> Result<usize, JsValue> {
        Ok(serialize_op(&self.tagged_op().op).map_err(fmt_err)?.len())
    }

    #[wasm_bindgen(js_name = srcFile)]
    pub fn src_file(&self) -> String {
        self.tagged_op().src_file.to_string()
    }

    #[wasm_bindgen(js_name = srcLine)]
    pub fn src_line(&self) -> u32 {
        self.tagged_op().src_line
    }

    #[wasm_bindgen(js_name = srcColumn)]
    pub fn src_column(&self) -> u32 {
        self.tagged_op().src_column
    }
    
    #[wasm_bindgen(js_name = srcCode)]
    pub fn src_code(&self, max_width: u32) -> Option<String> {
        self.tagged_op().src_code.iter().filter_map(|&(width, ref src)| {
            if width > max_width { None } else { Some(src.to_string()) }
        }).next()
    }

    #[wasm_bindgen(js_name = pushedNames)]
    pub fn pushed_names(&self) -> Option<Vec<JsValue>> {
        self.tagged_op().pushed_names.as_ref().map(|pushed_names| {
            pushed_names.iter().map(|name| name.as_ref().map(|name| name.to_string()).into()).collect()
        })
    }

    #[wasm_bindgen(js_name = altPushedNames)]
    pub fn alt_pushed_names(&self) -> Option<Vec<JsValue>> {
        self.tagged_op().alt_pushed_names.as_ref().map(|pushed_names| {
            pushed_names.iter().map(|name| name.as_ref().map(|name| name.to_string()).into()).collect()
        })
    }
}

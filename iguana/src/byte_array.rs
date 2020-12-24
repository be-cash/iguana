use wasm_bindgen::prelude::*;
use std::sync::Arc;

#[wasm_bindgen]
#[derive(Clone)]
pub struct ByteArray {
    byte_arrays: Arc<[bitcoin_cash::ByteArray]>,
    idx: usize,
}

impl ByteArray {
    pub fn new(byte_arrays: Arc<[bitcoin_cash::ByteArray]>, idx: usize) -> Self {
        ByteArray { byte_arrays, idx }
    }

    pub fn from_byte_array(byte_array: bitcoin_cash::ByteArray) -> Self {
        ByteArray {
            byte_arrays: Arc::new([byte_array]),
            idx: 0,
        }
    }

    fn byte_array(&self) -> &bitcoin_cash::ByteArray {
        &self.byte_arrays[self.idx]
    }
}

#[wasm_bindgen]
impl ByteArray {
    pub fn data(&self) -> Vec<u8> {
        self.byte_array().data().to_vec()
    }

    pub fn hex(&self) -> String {
        hex::encode(&self.byte_array().data())
    }

    pub fn len(&self) -> usize {
        self.byte_array().len()
    }

    pub fn hexdump(&self) -> String {
        pretty_hex::pretty_hex(&self.byte_array().data())
    }

    pub fn name(&self) -> Option<String> {
        self.byte_array().name_arc().map(|name| name.to_string())
    }

    pub fn function(&self) -> String {
        format!("{:?}", self.byte_array().function())
    }

    #[wasm_bindgen(js_name = hasPreimage)]
    pub fn has_preimage(&self) -> bool {
        self.byte_array().preimage_arc().is_some()
    }
    
    pub fn preimages(&self) -> Result<Vec<JsValue>, JsValue> {
        let preimages = self.byte_array().preimage_arc().ok_or("Byte array has no preimage")?;
        Ok((0..preimages.len()).into_iter().map(|idx| {
            ByteArray {
                byte_arrays: Arc::clone(preimages),
                idx,
            }.into()
        }).collect())
    }
}

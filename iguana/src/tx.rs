use wasm_bindgen::prelude::*;
use bitcoin_cash::{json_to_tx, Hashed};
use std::sync::Arc;
use crate::{Script, ByteArray};

#[wasm_bindgen]
pub struct Tx {
    tx: Arc<bitcoin_cash::Tx>,
}

#[wasm_bindgen]
#[derive(Clone)]
pub struct TxInput {
    tx: Arc<bitcoin_cash::Tx>,
    input_idx: usize,
}

#[wasm_bindgen]
pub struct TxOutpoint {
    tx_hash: ByteArray,
    vout: u32,
}

#[wasm_bindgen]
pub struct TxOutput {
    tx: Arc<bitcoin_cash::Tx>,
    output_idx: usize,
}

fn fmt_err(err: impl std::fmt::Display) -> JsValue {
    err.to_string().into()
}

impl TxInput {
    pub fn tx(&self) -> Arc<bitcoin_cash::Tx> {
        Arc::clone(&self.tx)
    }

    pub fn input_idx(&self) -> usize {
        self.input_idx
    }
}

#[wasm_bindgen]
impl Tx {
    #[wasm_bindgen(js_name = fromJson)]
    pub fn from_json(json: &str) -> Result<Tx, JsValue> {
        Ok(Tx {
            tx: Arc::new(json_to_tx(json).map_err(fmt_err)?.hashed()),
        })
    }

    pub fn hash(&self) -> Vec<u8> {
        self.tx.hash().to_vec_le()
    }

    #[wasm_bindgen(js_name = hashHex)]
    pub fn hash_hex(&self) -> String {
        self.tx.hash().to_hex_le()
    }

    pub fn version(&self) -> i32 {
        self.tx.version()
    }

    #[wasm_bindgen(js_name = lockTime)]
    pub fn lock_time(&self) -> u32 {
        self.tx.lock_time()
    }

    #[wasm_bindgen(js_name = numInputs)]
    pub fn num_inputs(&self) -> usize {
        self.tx.inputs().len()
    }

    #[wasm_bindgen(js_name = inputAt)]
    pub fn input_at(&self, input_idx: usize) -> TxInput {
        TxInput {
            tx: Arc::clone(&self.tx),
            input_idx,
        }
    }

    pub fn inputs(&self) -> Vec<JsValue> {
        (0..self.tx.inputs().len()).into_iter().map(|idx| {
            TxInput {
                tx: Arc::clone(&self.tx),
                input_idx: idx,
            }.into()
        }).collect()
    }

    #[wasm_bindgen(js_name = numOutputs)]
    pub fn num_outputs(&self) -> usize {
        self.tx.outputs().len()
    }

    pub fn outputs(&self) -> Vec<JsValue> {
        (0..self.tx.inputs().len()).into_iter().map(|idx| {
            TxOutput {
                tx: Arc::clone(&self.tx),
                output_idx: idx,
            }.into()
        }).collect()
    }
}

impl TxInput {
    fn input(&self) -> &bitcoin_cash::TxInput {
        &self.tx.inputs()[self.input_idx]
    }
}

#[wasm_bindgen]
impl TxInput {
    pub fn script(&self) -> Script {
        Script::new(Arc::clone(self.input().script.ops_arc()))
    }

    #[wasm_bindgen(js_name = prevOut)]
    pub fn prev_out(&self) -> TxOutpoint {
        let prev_out = &self.input().prev_out;
        TxOutpoint {
            tx_hash: ByteArray::from_byte_array(prev_out.tx_hash.clone().into()),
            vout: prev_out.vout,
        }
    }

    pub fn sequence(&self) -> u32 {
        self.input().sequence
    }

    #[wasm_bindgen(js_name = lockScript)]
    pub fn lock_script(&self) -> Option<Script> {
        self.input().lock_script.as_ref().map(|lock_script| {
            Script::new(Arc::clone(lock_script.ops_arc()))
        })
    }

    pub fn value(&self) -> Option<u64> {
        self.input().value
    }
}

impl TxOutput {
    fn output(&self) -> &bitcoin_cash::TxOutput {
        &self.tx.outputs()[self.output_idx]
    }
}

#[wasm_bindgen]
impl TxOutput {
    pub fn script(&self) -> Script {
        Script::new(Arc::clone(self.output().script.ops_arc()))
    }

    pub fn value(&self) -> u64 {
        self.output().value
    }
}

#[wasm_bindgen]
impl TxOutpoint {
    #[wasm_bindgen(js_name = txHash)]
    pub fn tx_hash(&self) -> ByteArray {
        self.tx_hash.clone()
    }

    #[wasm_bindgen(js_name = txHashHex)]
    pub fn tx_hash_hex(&self) -> String {
        self.tx_hash.hex()
    }

    pub fn vout(&self) -> u32 {
        self.vout
    }
}

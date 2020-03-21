mod utils;
mod tx;
mod script;
mod byte_array;
mod interpreter;

pub use tx::*;
pub use byte_array::*;
pub use script::*;
pub use utils::*;
pub use interpreter::*;

#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

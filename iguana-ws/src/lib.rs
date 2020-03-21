use bitcoin_cash::{UnhashedTx, tx_to_json, error::Error};

use tokio::runtime::Runtime;
use futures::{StreamExt, SinkExt};
use warp::{Filter, filters::ws::Message};
use std::sync::RwLock;
use lazy_static::lazy_static;

lazy_static! {
    static ref JSON: RwLock<String> = RwLock::new("".to_string());
}

pub fn run_iguana_ws(make_tx: impl Fn() -> Result<UnhashedTx, Error>) {
    pretty_env_logger::init();

    let tx = make_tx().expect("Failed building transaction:");
    *JSON.write().unwrap() = tx_to_json(&tx).unwrap();

    let mut rt = Runtime::new().expect("Failed setting up runtime");

    rt.block_on(async {
        let routes = warp::path("tx")
            .and(warp::ws())
            .map(|ws: warp::ws::Ws| {
                ws.on_upgrade(|websocket| {
                    async {
                        println!("Sent tx.");
                        let (mut outgoing, mut incoming) = websocket.split();
                        let json_text = JSON.read().unwrap().clone();
                        if let Err(err) = outgoing.send(Message::text(json_text)).await {
                            eprintln!("Error sending tx: {}", err);
                        }
                        while let Some(msg) = incoming.next().await {
                            println!("got msg: {:?}", msg);
                        }
                    }
                })
            });

        let addr: std::net::SocketAddr = ([127, 0, 0, 1], 3030).into();
        println!("Serving websocket at {}", addr);

        warp::serve(routes).run(addr).await;
    })
}

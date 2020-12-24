use bitcoin_cash::{UnhashedTx, tx_to_json, error::Error};

use tokio::runtime::Runtime;
use futures::{StreamExt, SinkExt};
use warp::{Filter, filters::ws::Message};
use std::sync::RwLock;
use std::time::Instant;
use lazy_static::lazy_static;

lazy_static! {
    static ref JSON: RwLock<String> = RwLock::new("".to_string());
}

pub fn run_iguana_ws(make_tx: impl Fn() -> Result<UnhashedTx, Error>) {
    pretty_env_logger::init();

    let t0 = Instant::now();
    let tx = make_tx().expect("Failed building transaction:");
    let dt_build_tx = t0.elapsed().as_micros();
    let t1 = Instant::now();
    *JSON.write().unwrap() = tx_to_json(&tx).unwrap();
    let dt_json_tx = t1.elapsed().as_micros();

    println!("dt build: {}ms", dt_build_tx as f64 / 1000.0);
    println!("dt json: {}ms", dt_json_tx as f64 / 1000.0);

    let mut rt = Runtime::new().expect("Failed setting up runtime");

    rt.block_on(async {
        let routes = warp::path("tx")
            .and(warp::ws())
            .map(|ws: warp::ws::Ws| {
                ws.on_upgrade(|websocket| {
                    async {
                        println!("Sending tx.");
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

pub async fn run_iguana_ws_async(make_tx: impl Fn() -> Result<UnhashedTx, Error>) {
    pretty_env_logger::init();

    let t0 = Instant::now();
    let tx = make_tx().expect("Failed building transaction:");
    let dt_build_tx = t0.elapsed().as_micros();
    let t1 = Instant::now();
    *JSON.write().unwrap() = tx_to_json(&tx).unwrap();
    let dt_json_tx = t1.elapsed().as_micros();

    println!("dt build: {}ms", dt_build_tx as f64 / 1000.0);
    println!("dt json: {}ms", dt_json_tx as f64 / 1000.0);

    let routes = warp::path("tx")
        .and(warp::ws())
        .map(|ws: warp::ws::Ws| {
            ws.on_upgrade(|websocket| {
                async {
                    println!("Sending tx.");
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

    warp::serve(routes).run(addr).await
}

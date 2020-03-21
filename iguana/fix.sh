
awk \
    '$0 = NR==1 ? replace : $0' \
    replace="let wasm = undefined; export const ready = new Promise((resolve) => import('./iguana_bg.wasm').then(w => { wasm = w; resolve(); }));" \
    pkg/iguana.js > tmpfile

mv tmpfile pkg/iguana.js

awk \
    '$0 = NR==4 ? replace : $0' \
    replace="*/ export const ready: Promise<void>" \
    pkg/iguana.d.ts > tmpfile

mv tmpfile pkg/iguana.d.ts


awk \
    '$0 = NR==1 ? replace : $0' \
    replace="let wasm = undefined; export const ready = new Promise((resolve) => import('./iguana_lib_bg.wasm').then(w => { wasm = w; resolve(); }));" \
    pkg/iguana_lib.js > tmpfile

mv tmpfile pkg/iguana_lib.js

awk \
    '$0 = NR==4 ? replace : $0' \
    replace="*/ export const ready: Promise<void>" \
    pkg/iguana_lib.d.ts > tmpfile

mv tmpfile pkg/iguana_lib.d.ts

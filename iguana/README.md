# iguana-lib
Read Transactions, Scripts, ByteArrays and their preimages and evaluate transactions with this package.

# Install

```
npm install --save iguana-lib
```

# Note

Upon importing iguana-lib, it will instantiate the wasm package, which will be available once the `ready` Promise resolves:

```typescript
import { ready, ECC } from 'iguana-lib';

ready.then(() => {
  const ecc = new ECC();
  console.log('Hello iguana!', ecc);
})

```

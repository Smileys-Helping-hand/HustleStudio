# Firestore Optimization Checklist

1. **Indexes for common queries**  
   Ensure dashboard, inventory, and report queries have composite indexes for `orderBy('total')` and any filtered fields.
2. **Batch writes**  
   Group inventory adjustments with `writeBatch` or `runTransaction` to keep latency predictable.
3. **Cache-aware reads**  
   Consider `react-query` or `swr` for memoised reads when the app reconnects from offline mode.
4. **Pagination**  
   Use `limit()` / `startAfter()` for large collections to avoid loading all documents at once.
5. **Security rules**  
   Restrict reads & writes by user role (admin/staff) and shield the `userSettings` + `userAssets` collections.

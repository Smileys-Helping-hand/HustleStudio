# Firestore Optimization Recommendations

1. ✅ **Use indexed queries**  
   - Ensure filters/sorts in reports and inventory are indexed via Firestore console.

2. ✅ **Batch writes**  
   - Use `writeBatch()` for multi-item inventory updates.

3. ✅ **Pagination / Limits**  
   - For large datasets in reports, apply `.limit(50)` and infinite scroll.

4. ✅ **Caching layer**  
   - Consider `react-query` or `swr` for caching reads.

5. ✅ **Security Rules Review**  
   - Verify `read`/`write` rules restrict by user roles (admin/staff).

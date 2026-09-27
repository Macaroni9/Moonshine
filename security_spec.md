# Security Specification & Test Plan

## 1. Data Invariants
1. Only signed-in staff members can read or write to `orders`, `presence`, and `users`.
2. Users can only edit their own user profile in `users/{userId}`.
3. An order ticket cannot be modified with arbitrary unwhitelisted keys.
4. Orders can be created with valid statuses ('PENDING'), and updated to valid transitions ('PREPARING', 'READY', 'SERVED', 'CANCELLED').
5. Device presence can only be written by authenticated users where `request.auth.uid == incoming().uid`.
6. Batch or shift resets can be performed by authenticated staff.

## 2. The "Dirty Dozen" Malicious Payloads
1. **Unauthenticated Read**: Attempting to read `/orders` without auth token -> PERMISSION_DENIED.
2. **Unauthenticated Write**: Attempting to create an order without auth token -> PERMISSION_DENIED.
3. **Impersonate User Profile**: User A attempting to write to `/users/user-b` -> PERMISSION_DENIED.
4. **Invalid Table Identifier**: Order with empty or >50 char tableNumber -> PERMISSION_DENIED.
5. **Ghost Field Injection**: Adding `{ shadowAdmin: true }` to an order document -> PERMISSION_DENIED.
6. **Presence Spoofing**: User A creating a presence beacon claiming `uid: 'user-b'` -> PERMISSION_DENIED.
7. **Negative Order Number**: Order ticket with `orderNumber: -15` -> PERMISSION_DENIED.
8. **Invalid Status Injection**: Order with `status: 'FREE_FOOD_HACK'` -> PERMISSION_DENIED.
9. **Junk ID Poisoning**: Document with invalid ID characters or length > 128 -> PERMISSION_DENIED.
10. **Huge Notes Overflow**: `orderNotes` with 10,000 characters -> PERMISSION_DENIED.
11. **Malicious Role Injection**: Self-assigning `role: 'superadmin'` in user profile -> PERMISSION_DENIED.
12. **Presence Timestamp Tampering**: Injecting non-number lastSeen -> PERMISSION_DENIED.

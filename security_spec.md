# Security Specification - Kingdom of Mastery

## Core Data Invariants
1. **Scope Integrity**: Profiles can only be accessed or modified by their absolute owners (`request.auth.uid == userId`).
2. **Quest Identity**: A daily quest cannot be completed, updated, or created under a different user's sub-profile path.
3. **District Sync**: District levels can only be advanced or modified by the absolute owner.
4. **No Price Manipulation / Illegal Purchasing**: Inventory purchases require owner validation and correct fields.

## The "Dirty Dozen" Malicious Payloads (Vulnerability Vectors)
Below are 12 malicious payloads or requests designed to exploit potential security update gaps. All of these MUST return `PERMISSION_DENIED`:

### 1. Identity Spoofing (Setting alternative ownerId in Profile)
Attempt to write a user profile with an owner ID that does not match the authenticated session:
```json
{
  "userId": "attacker_123",
  "name": "Sir Alaric",
  "xp": 14250,
  "crystals": 750,
  "streak": 14,
  "bossHp": 650,
  "level": 12,
  "nextEvolution": "The Emperor"
}
```

### 2. State Shortcutting (Updating bossHp directly to 0)
Reducing bossHp to 0 without completing any active quests:
```json
{
  "bossHp": 0
}
```

### 3. Resource Poisoning (Large integer overflow for XP)
Injecting massive integers to gain maximum leveling advantages instantly:
```json
{
  "xp": 999999999
}
```

### 4. Privilege Escalation (Setting admin variables)
Attempt to inject shadow administrative roles or settings:
```json
{
  "isAdmin": true,
  "role": "admin"
}
```

### 5. Ghost Field Injection (Shadow fields inside Profile)
Adding arbitrary keys matching undocumented properties:
```json
{
  "userId": "valid_user_uid",
  "name": "Player 1",
  "xp": 100,
  "crystals": 50,
  "streak": 1,
  "bossHp": 1000,
  "level": 1,
  "nextEvolution": "The Warrior",
  "isCheater": true
}
```

### 6. Foreign Quest Hijacking
Creating or completing daily quests under another user's profile:
```json
{
  "id": "quest_hijacked",
  "title": "Stolen Victory",
  "desc": "Gain reward index of another player",
  "xp": 1000,
  "completed": true
}
```

### 7. Immortal Field Tampering (Modifying profile setup dates)
Trying to modify user registration parameters (`createdAt`):
```json
{
  "createdAt": "2020-01-01T00:00:00Z"
}
```

### 8. Illegal District Advancement
Updating a district level to maximum (e.g., Level 99) directly in the document:
```json
{
  "level": 99
}
```

### 9. Price Tampering (Zero-cost shopping)
Attempting to insert premium inventory without actual checkout or deducting currency:
```json
{
  "itemId": "skin_pack_obsidian",
  "title": "Obsidian skin",
  "rarity": "legendary",
  "category": "relic",
  "cost": 0
}
```

### 10. List Query Scraping / Query Trust Violations
Scraping full listings of other users profiles without strict filtering constraints.

### 11. Arbitrary String Injection
Injecting massive junk string payloads as a document name to trigger denial of wallet.

### 12. Temporal Timestamp Spoofing
Re-submitting stale client timestamps to falsify daily habits or streaks.

---

## The Test Runner Description
The accompanying tests securely block each attempt. We ensure standard rules deployment verifies all of these vectors.

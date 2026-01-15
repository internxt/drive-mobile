# AI Testing Prompt

Use this prompt when asking AI to write or review tests:

---

## Prompt for Writing Tests

```
Write tests following behavioral testing patterns:

STRUCTURE:
1. Main describe: describe('OAuth custom hook', ...) - Describe WHAT is tested, not technical names
2. Nested describe: Use context grouping like 'Auth origin', 'On component mount', 'Handling successful OAuth'
3. Test cases: Use "when X, then Y" format

RULES:
- ❌ NO variable names in descriptions (isOAuthFlow, authOrigin, handleOAuthSuccess)
- ❌ NO function/method names in descriptions (sendAuthSuccess method, validateFile function)
- ❌ NO technical implementation details
- ❌ NO console log assertions unless critical
- ✅ YES domain language (OAuth process, credentials, authentication)
- ✅ YES clear outcomes (is activated, are sent, succeeds, fails)
- ✅ YES plain English that non-technical people can understand

EXAMPLES:

✅ GOOD:
describe('OAuth custom hook', () => {
  describe('Auth origin', () => {
    it('when an auth origin is provided, then the OAuth process is activated', () => { ... })
    it('when an auth origin is not provided, then the OAuth process remains inactive', () => { ... })
  })

  describe('Handling successful OAuth', () => {
    it('when the OAuth process completes successfully, then credentials are sent and success is reported', () => { ... })
    it('when the OAuth process fails or is not completed, then failure is reported', () => { ... })
  })
})

❌ BAD:
describe('useOAuthFlow', () => {
  describe('isOAuthFlow property', () => {
    it('should return true when authOrigin is provided', () => { ... })
    it('should return false when authOrigin is null', () => { ... })
  })

  describe('handleOAuthSuccess method', () => {
    it('should send credentials to OAuth service and return true on success', () => { ... })
    it('should return false when OAuth service fails', () => { ... })
  })
})

Focus on behavior and outcomes, not implementation details.
```

---

## Prompt for Reviewing Tests

```
Review these tests using behavioral testing principles:

Check for:
1. ❌ Technical names in descriptions (variable/function/method names)
2. ❌ Implementation details instead of behaviors
3. ❌ "should" at the start instead of "when/then" format
4. ❌ Console log assertions
5. ✅ Clear "when X, then Y" structure
6. ✅ Domain language
7. ✅ Readable by non-technical people

Suggest improvements to make tests more behavioral and maintainable.
```

---

## Quick Reference Card

```
PATTERN:

describe('[What is being tested]', () => {
  describe('[Context/Scenario]', () => {
    it('when [action/condition], then [expected outcome]', () => { ... })
  })
})

AVOID:
- Variable names
- Function names
- Method names
- Property names
- Technical jargon
- Implementation details
- Console log checks

USE:
- Domain language
- User-facing behavior
- Expected outcomes
- Plain English
- Business logic terms
```

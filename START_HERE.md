# START HERE

This ZIP includes executable React Native starter code, user screenshot references, AI architecture, detailed product/visual specifications, and an autonomous coding-agent kickoff prompt.

**1. Unzip, cd to `brief-starter`.**

**2. From a network-enabled machine:**

```bash
bash scripts/install-agent-skills.sh
bash scripts/setup.sh
npm run android  # or npm run ios from macOS
```

**3. In Claude Code:** Paste `prompts/INITIAL_PROMPT.md` as the FIRST instruction. It requires the agent to read all MD files, inspect all screenshots, verify/install Matt Pocock and Ponytail skills, run actual local AI and test on device.

**4. Provide an on-device GGUF model:** Open Settings → Import GGUF. The ZIP does not contain a multi-GB model. Online job discovery is a distinct feature from local AI.

This is a sizeable starter; it is **not** a verified production APK. Runtime work remaining and known limitations are listed in `README.md` and `docs/architecture/IMPLEMENTATION_STATUS.md`.

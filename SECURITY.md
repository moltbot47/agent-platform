# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 1.x     | Yes                |
| < 1.0   | No                 |

Only the latest release on the `main` branch receives security updates.
Pre-release, alpha, and beta branches are **not** covered by this policy.

## Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email us at:

**security@eulaproperties.com**

Include the following in your report:

1. **Description** -- A clear explanation of the vulnerability and its potential impact.
2. **Reproduction steps** -- Detailed, step-by-step instructions to reproduce the issue.
3. **Affected component** -- The specific module, endpoint, or service involved (e.g., `backend/core/authentication.py`, `/api/v1/agents/`).
4. **Environment** -- Python version, OS, Django version, and any relevant configuration.
5. **Proof of concept** -- Code snippets, screenshots, or logs that demonstrate the vulnerability. Attach any tooling output (e.g., Burp Suite, OWASP ZAP).
6. **Suggested fix** -- If you have one, a proposed patch or mitigation approach.

### What Qualifies as a Security Issue

We consider the following categories in scope, aligned with the
[OWASP Top 10 (2021)](https://owasp.org/www-project-top-ten/):

- **Broken Access Control** -- Unauthorized access to other users' agents, API keys, or data.
- **Cryptographic Failures** -- Weak hashing, exposed secrets, insecure token generation.
- **Injection** -- SQL injection, OS command injection, ORM injection, template injection.
- **Insecure Design** -- Authentication/authorization bypass, privilege escalation.
- **Security Misconfiguration** -- Debug mode in production, default credentials, overly permissive CORS.
- **Vulnerable and Outdated Components** -- Known CVEs in dependencies.
- **Identification and Authentication Failures** -- Brute-force attacks, session fixation, weak API key schemes.
- **Software and Data Integrity Failures** -- Unsigned updates, insecure deserialization.
- **Security Logging and Monitoring Failures** -- Missing audit trails for sensitive operations.
- **Server-Side Request Forgery (SSRF)** -- Ability to make the server issue arbitrary HTTP requests.

### Out of Scope

- Denial-of-service attacks that require excessive resources to execute.
- Social engineering or phishing attacks against team members.
- Vulnerabilities in third-party services we do not control.
- Reports from automated scanners without a verified, exploitable finding.

## Response Timeline

| Stage                    | Target        |
|--------------------------|---------------|
| Acknowledgment           | 48 hours      |
| Initial triage           | 5 business days |
| Status update to reporter | 10 business days |
| Patch release (critical) | 14 days       |
| Patch release (high)     | 30 days       |
| Patch release (medium/low) | Next scheduled release |

We will keep you informed throughout the process. If we need more information,
we will reach out to the email address you used to submit the report.

## Disclosure Policy

We follow **coordinated responsible disclosure**:

1. **Reporter** submits the vulnerability privately via email.
2. **We** acknowledge, triage, and begin work on a fix.
3. **We** coordinate a disclosure date with the reporter (typically after the patch is released).
4. **We** publish a security advisory on GitHub and credit the reporter (unless anonymity is requested).

We ask that reporters:

- Allow us reasonable time to investigate and address the issue before public disclosure.
- Make a good-faith effort to avoid accessing or modifying other users' data.
- Not exploit the vulnerability beyond what is necessary to demonstrate the issue.

## Safe Harbor

We consider security research conducted in accordance with this policy to be:

- **Authorized** under applicable anti-hacking laws (including the CFAA).
- **Exempt** from DMCA restrictions on circumvention of technological measures.
- **Lawful, helpful, and conducted in good faith.**

We will not initiate legal action against researchers who:

- Act in good faith and follow this disclosure policy.
- Avoid privacy violations, data destruction, and service disruption.
- Only interact with accounts they own or have explicit permission to test.

If legal action is initiated by a third party against a researcher who followed
this policy, we will take steps to make it known that the researcher's actions
were authorized under this policy.

## Security Best Practices (For Contributors)

When contributing to this project, please follow these guidelines:

- Never commit secrets, API keys, or credentials to the repository.
- Use environment variables for all sensitive configuration (12-Factor).
- Validate and sanitize all user input at API boundaries.
- Use parameterized queries; never interpolate user input into SQL.
- Keep dependencies up to date; review Dependabot alerts promptly.
- Write tests for authentication and authorization logic.
- Follow the principle of least privilege for all access controls.

## References

- [OWASP Top 10 (2021)](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/archive/2023/2023_top25_list.html)

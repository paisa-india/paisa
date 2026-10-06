# Security policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Report them privately through GitHub: go to the repository's **Security** tab and choose **Report a vulnerability**. The maintainer ([@amar-rokade](https://github.com/amar-rokade)) will acknowledge within seven days.

Useful reports include a description, the affected file or page, steps to reproduce, and the possible impact.

## Scope

In scope: this repository's code, the published website, the GitHub workflows, and the integrity of published data (for example, a way to make Paisa publish numbers that don't match their source).

Out of scope: vulnerabilities in government websites that Paisa reads. Report those to the relevant department or CERT-In (https://www.cert-in.org.in/).

## Practices

- No secrets in the repository; tokens live only in GitHub Actions secrets.
- The site is static: no user accounts, no database, no personal data collected. My Tax runs entirely in the browser.
- Collectors fetch only fixed, allow-listed URLs and never bypass access controls.
- Every published number is reproducible from a saved file identified by its SHA-256 hash.
- Dependabot, secret scanning and code scanning should be enabled on the repository.

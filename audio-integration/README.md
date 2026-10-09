# Separately hosted AUDIO frontend integration

Do not publish before production approval. This directory is a deployable additive overlay for zasumaster.com, not a GitHub Pages route. Copy account-connect.html and the two new assets to the AUDIO host. In index.html, mix/index.html, convert/index.html and upload.html, add the following before all existing application scripts:

```html
<link rel="stylesheet" href="/assets/account-integration.css">
<script src="/assets/account-integration.js"></script>
```

Preserve all existing scripts, payments, upload/download behavior. Deploy ACCOUNT migration/API and native API wrappers before loading this script. Native wrappers authenticate an optional scoped connection; anonymous requests call the original handler unchanged. Rollback: remove these two tags first; existing guest flows remain intact. Existing MASTER history cannot be automatically claimed by application/visitor identifiers. The original 24-hour storage cleanup remains unchanged.

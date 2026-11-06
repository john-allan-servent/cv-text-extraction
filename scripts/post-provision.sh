#!/bin/sh
uri=$(azd env get-value SERVICE_API_URI 2>/dev/null) || exit 0
echo
echo "Provisioning complete. Finish the Entra ID setup (see README.md, \"Entra ID app registrations\"):"
echo "  SPA redirect URI to add : $uri"
echo "  SPA app (client) ID     : $(azd env get-value SPA_CLIENT_ID 2>/dev/null)"
echo

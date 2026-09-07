# OASIS authentication email setup

## Sending identity

- Sending domain: `mail.useoasis.app`
- Sender name: `OASIS`
- Sender address: `accounts@mail.useoasis.app`
- Invite subject: `You’ve been invited to join OASIS`

## Supabase configuration

1. Set the Auth Site URL to `https://www.useoasis.app`.
2. Keep `https://www.useoasis.app/accept-invitation` in the redirect allow list.
3. Connect the verified Resend domain as the custom email provider.
4. Paste `invite.html` into the **Invite user** email template and use the subject above.
5. Disable provider click tracking for authentication email links.

The invitation template links to `/confirm-invitation` with the Supabase token
hash. That page requires a deliberate second click before the one-time token is
verified, reducing the chance that an automated school email scanner consumes
the invitation.

## Release check

Test one new invitation with each of the following before a wider beta:

- a personal Gmail address;
- a Microsoft/Outlook address;
- a school-managed address.

Confirm the provider reports each message as delivered and that the OASIS
acceptance flow reaches the correct school and class.

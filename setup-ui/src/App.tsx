import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import logo from '@/assets/mailbridge-full-logo.svg'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupText, InputGroupInput } from '@/components/ui/input-group'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

type Provider = 'icloud' | 'cpanel'
interface Preset { imap_host: string; imap_port: number; imap_secure: boolean; smtp_host: string; smtp_port: number; smtp_secure: boolean; hint: React.ReactNode }
interface Account { label: string; imap: { host: string; user: string } }
interface AccountsResponse { active: string; accounts: Record<string, Account> }

const PRESETS: Record<Provider, Preset> = {
  icloud: {
    imap_host: 'imap.mail.me.com', imap_port: 993, imap_secure: true, smtp_host: 'smtp.mail.me.com', smtp_port: 587, smtp_secure: false,
    hint: (
      <span>
        Mailbridge needs an <a href="https://account.apple.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300">app-specific password</a> to access your email securely. Go to account.apple.com &rarr; Sign-In &amp; Security &rarr; App-Specific Passwords
      </span>
    )
  },
  cpanel: {
    imap_host: '', imap_port: 993, imap_secure: true, smtp_host: '', smtp_port: 465, smtp_secure: true,
    hint: <span>Used for both incoming and outgoing mail. Usually looks like <code className="text-xs text-blue-600 dark:text-blue-400 bg-muted px-1 py-0.5 rounded">mail.yourdomain.com</code> — check your email provider's settings or ask your host.</span>
  }
}

export default function App() {
  const [provider, setProvider] = useState<Provider>('icloud')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mailHost, setMailHost] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [accounts, setAccounts] = useState<AccountsResponse | null>(null)
  const [legalOpen, setLegalOpen] = useState<'terms' | 'privacy' | null>(null)
  const [triedSubmit, setTriedSubmit] = useState(false)

  useEffect(() => { fetch('/accounts').then(r => r.json()).then(setAccounts).catch(() => { }) }, [])

  function applyPreset(p: Provider) {
    setProvider(p)
    setMailHost('')
  }

  async function saveAccount() {
    setLoading(true);
    try {
      const res = await fetch('/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider, name: name.trim().toLowerCase().replace(/\s+/g, '-'),
          email: email.trim(), password,
          imap_host: provider === 'icloud' ? PRESETS.icloud.imap_host : mailHost.trim(),
          imap_port: PRESETS[provider].imap_port,
          imap_secure: true,
          smtp_host: provider === 'icloud' ? PRESETS.icloud.smtp_host : mailHost.trim(),
          smtp_port: PRESETS[provider].smtp_port,
          smtp_secure: true
        })
      })
      const result = await res.json()
      if (result.ok) {
        setSuccess(result.message);
      } else {
        showErrorToast(result.code, result.error);
      }
    } catch {
      showErrorToast('server', 'Could not reach the setup server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function showErrorToast(code?: string, message?: string) {
    const title = code === 'auth' ? 'Incorrect credentials'
      : code === 'connect' ? 'Cannot reach mail server'
        : 'Something went wrong'
    const description = message || 'Please check your details and try again.'
    toast.error(title, { description })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTriedSubmit(true);

    const isNameInvalid = !name.trim();
    const isEmailInvalid = !email.trim();
    const isPasswordInvalid = !password.trim();
    const isMailHostInvalid = provider === 'cpanel' && !mailHost.trim();

    if (isNameInvalid || isEmailInvalid || isPasswordInvalid || isMailHostInvalid) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check if email already connected
    const isEmailConnected = accounts && Object.values(accounts.accounts).some(
      acc => acc.imap?.user?.toLowerCase() === email.trim().toLowerCase()
    );

    if (isEmailConnected) {
      toast('Existing account', {
        description: 'This email account is already connected.',
        action: {
          label: 'dismiss',
          onClick: () => { }
        }
      });
      return;
    }

    await saveAccount();
  }

  if (success) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md text-center border-none ring-0 shadow-none ">
        <CardHeader className="flex flex-col items-center">
          <img src={logo} alt="Mailbridge" className="h-10 w-auto mx-auto mb-2" />
          <CardTitle className="text-2xl mt-2 text-center tracking-tight">Your email is connected</CardTitle>
          <CardDescription className="mt-2">Mailbridge can now help Claude read, search, organise, and send emails from this account. You can now safely close this window.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-lg bg-transparent border-none ring-0 shadow-none">
        <CardHeader>
          <div className="flex flex-col items-center gap-2 mb-2">
            <img src={logo} alt="Mailbridge" className="h-10 w-auto dark:invert" />
            <CardTitle className="text-3xl mt-2 text-center tracking-tight">Connect your email account</CardTitle>
            <CardDescription className="text-center max-w[460px] mt-1">
              Mailbridge securely connects Claude to your inbox.
              This setup is only required once. Your login details are encrypted
              and saved in your device’s secure keychain.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <fieldset disabled={loading} className="space-y-3 border-none p-0 m-0">
              <InputGroup>
                <InputGroupAddon align="block-start">
                  <InputGroupText>Provider</InputGroupText>
                </InputGroupAddon>
                <Select value={provider} onValueChange={(v) => applyPreset(v as Provider)} disabled={loading}>
                  <SelectTrigger className="w-full border-0 bg-transparent shadow-none ring-0 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 px-3 pb-3 h-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="w-full p-1">
                    <SelectItem value="icloud">iCloud</SelectItem>
                    <SelectItem value="cpanel">Other IMAP account</SelectItem>
                  </SelectContent>
                </Select>
              </InputGroup>
              <InputGroup>
                <InputGroupAddon align="block-start">
                  <InputGroupText className="flex items-center gap-1">
                    Account Label
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="!pointer-events-auto cursor-help">
                          <path d="M7.99967 14.6673C4.31777 14.6673 1.33301 11.6825 1.33301 8.00065C1.33301 4.31875 4.31777 1.33398 7.99967 1.33398C11.6815 1.33398 14.6663 4.31875 14.6663 8.00065C14.6663 11.6825 11.6815 14.6673 7.99967 14.6673ZM7.33301 7.33398V11.334H8.66634V7.33398H7.33301ZM7.33301 4.66732V6.00065H8.66634V4.66732H7.33301Z" fill="#71717A" />
                        </svg>
                      </TooltipTrigger>
                      <TooltipContent>
                        Used only to identify this account inside Mailbridge.
                      </TooltipContent>
                    </Tooltip>
                  </InputGroupText>
                </InputGroupAddon>
                <InputGroupInput id="name" placeholder="Personal iCloud" value={name} onChange={e => setName(e.target.value)} aria-invalid={triedSubmit && !name.trim() ? "true" : "false"} required />
              </InputGroup>
              <InputGroup>
                <InputGroupAddon align="block-start">
                  <InputGroupText>Email address</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} aria-invalid={triedSubmit && !email.trim() ? "true" : "false"} required />
              </InputGroup>

              <InputGroup>
                <InputGroupAddon align="block-start">
                  <InputGroupText>{provider === 'cpanel' ? 'Password' : 'App-Specific Password'}</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput id="password" type="password" placeholder="••••••••••••" value={password} onChange={e => setPassword(e.target.value)} aria-invalid={triedSubmit && !password.trim() ? "true" : "false"} required />
              </InputGroup>
              {provider === 'icloud' && PRESETS.icloud.hint && <p className="text-xs text-muted-foreground mt-1.5">{PRESETS.icloud.hint}</p>}

              {provider === 'cpanel' && (
                <div className="space-y-3">
                  <InputGroup>
                    <InputGroupAddon align="block-start">
                      <InputGroupText>Mail server</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      placeholder="mail.yourdomain.com"
                      value={mailHost}
                      onChange={e => setMailHost(e.target.value)}
                      aria-invalid={triedSubmit && !mailHost.trim() ? "true" : "false"}
                      required
                    />
                  </InputGroup>
                  <p className="text-xs text-muted-foreground">{PRESETS.cpanel.hint}</p>
                </div>
              )}
            </fieldset>
            <div className="flex flex-col gap-4 pt-6">
              <Button type="submit" className="w-full text-base font-heading flex items-center justify-center gap-2 cursor-pointer" disabled={loading}>
                {loading && <Loader2 className="animate-spin size-4" />}
                {loading ? 'Connecting...' : 'Connect Account'}
              </Button>
              <p className="text-xs text-center text-muted-foreground">By connecting your account, you agree to the{' '}
                <button type="button" onClick={() => setLegalOpen('terms')} className="underline text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer">Terms of Use</button>
                {' '}and{' '}
                <button type="button" onClick={() => setLegalOpen('privacy')} className="underline text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer">Privacy Policy</button>.
              </p>
            </div>

          </form>
        </CardContent>
      </Card>

      {/* Legal modals */}
      <Dialog open={legalOpen !== null} onOpenChange={(o) => { if (!o) setLegalOpen(null) }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto no-scrollbar">
          {legalOpen === 'terms' && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-foreground">Terms of Use</DialogTitle>
              </DialogHeader>
              <div className="text-sm text-muted-foreground space-y-4 leading-relaxed">
                <p><strong className="text-xl font-medium text-foreground">Last updated:</strong> June 2026</p>
                <p>Mailbridge ("the plugin") is a local tool that connects Claude to your personal email account via standard IMAP and SMTP protocols. By using Mailbridge you agree to the following terms.</p>
                <h3 className="text-xl font-medium text-foreground">1. Local use only</h3>
                <p>Mailbridge runs entirely on your device. It is not a cloud service and has no Mailbridge servers. All connections are made directly from your machine to your email provider.</p>
                <h3 className="text-xl font-medium text-foreground">2. Your responsibilities</h3>
                <p>You are responsible for keeping your email credentials secure. You must ensure you have the right to access any account you connect. Do not use Mailbridge to access accounts you do not own or have authorisation to use.</p>
                <h3 className="text-xl font-medium text-foreground">3. Third-party services</h3>
                <p>Mailbridge works alongside Claude by Anthropic. Your use of Claude is governed by <a href="https://www.anthropic.com/legal/consumer-terms" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 dark:text-blue-400">Anthropic's Terms of Service</a>. Mailbridge has no affiliation with Apple, cPanel, or any email provider.</p>
                <h3 className="text-xl font-medium text-foreground">4. No warranty</h3>
                <p>Mailbridge is provided "as is" without any warranty. The creator is not liable for any loss of data, missed emails, or damages arising from use of this plugin.</p>
                <h3 className="text-xl font-medium text-foreground">5. Changes</h3>
                <p>These terms may be updated at any time. Continued use of the plugin constitutes acceptance of any revised terms.</p>
              </div>
            </>
          )}
          {legalOpen === 'privacy' && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-foreground">Privacy Policy</DialogTitle>
              </DialogHeader>
              <div className="text-sm text-muted-foreground space-y-4 leading-relaxed">
                <p><strong className="text-xl font-medium text-foreground">Last updated:</strong> June 2026</p>
                <p>Your privacy matters. Here is exactly what Mailbridge does and does not do with your data.</p>
                <h3 className="text-xl font-medium text-foreground">What we collect</h3>
                <p>Nothing. Mailbridge collects no analytics, usage data, or personal information. There are no Mailbridge servers and no data is ever sent anywhere by this plugin.</p>
                <h3 className="text-xl font-medium text-foreground">Your credentials</h3>
                <p>Your email password is saved exclusively in your device's <strong className="text-md font-medium text-foreground">macOS Keychain</strong> — the same secure system used by Safari and iCloud. It is never written to a file, never logged, and never leaves your device through Mailbridge.</p>
                <h3 className="text-xl font-medium text-foreground">Your email content</h3>
                <p>Emails are fetched directly from your email provider to your device over an encrypted (SSL/TLS) connection. Email content is read by Claude running locally through the Cowork plugin system. Anthropic's privacy policy governs how Claude handles that content.</p>
                <h3 className="text-xl font-medium text-foreground">Deleting your data</h3>
                <p>To remove all Mailbridge data from your device, delete the Keychain entries and the config file:</p>
                <pre className="bg-muted rounded p-3 text-xs overflow-x-auto">{`# Remove saved passwords from Keychain\nsecurity delete-generic-password -s "mailbridge"\n\n# Remove account config\nrm ~/.universal-email-accounts.json`}</pre>
                <h3 className="text-xl font-medium text-foreground">Contact</h3>
                <p>Questions? Reach out to the plugin author through the Claude plugin directory.</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div >
  )
}

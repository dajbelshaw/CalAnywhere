import dns from 'dns';
import net from 'net';

/**
 * Hostnames known to serve cloud metadata endpoints.
 * Requests to these should never leave the server.
 */
const BLOCKED_HOSTNAMES = [
  'metadata.google.internal',
  'metadata.goog',
  'metadata',
];

/**
 * Checks whether an IPv4 address falls in a private or reserved range.
 *
 * Blocked ranges:
 *  - 127.0.0.0/8    (loopback)
 *  - 10.0.0.0/8     (private)
 *  - 172.16.0.0/12  (private)
 *  - 192.168.0.0/16 (private)
 *  - 169.254.0.0/16 (link-local / cloud metadata)
 *  - 0.0.0.0        (unspecified)
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p))) return true; // malformed → reject

  const [a, b] = parts;

  if (a === 127) return true;                         // 127.0.0.0/8
  if (a === 10) return true;                          // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true;   // 172.16.0.0/12
  if (a === 192 && b === 168) return true;             // 192.168.0.0/16
  if (a === 169 && b === 254) return true;             // 169.254.0.0/16
  if (ip === '0.0.0.0') return true;                   // unspecified

  return false;
}

/**
 * Validates that a URL is safe to fetch (not targeting internal/private networks).
 *
 * Rejects: private IPs (10.x, 172.16-31.x, 192.168.x), loopback (127.x, ::1),
 * link-local (169.254.x), metadata endpoints, localhost, and non-https/webcal protocols.
 */
export async function isSafeToFetch(url: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  // Protocol check (defence in depth — credentials.ts also checks this)
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'webcal:') {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block known metadata hostnames
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    return false;
  }

  // Block 'localhost' by name
  if (hostname === 'localhost') {
    return false;
  }

  // If the hostname is already an IP literal, check it directly
  if (net.isIPv4(hostname)) {
    return !isPrivateIPv4(hostname);
  }
  if (net.isIPv6(hostname)) {
    // Block all IPv6 literals — the only private one we care about is ::1
    // but raw IPv6 in a URL is unusual enough to reject outright.
    return false;
  }

  // Resolve hostname to IP and check the result
  try {
    const { address, family } = await dns.promises.lookup(hostname);

    if (family === 6) {
      // ::1 or any IPv6 loopback
      if (address === '::1') return false;
      // Allow other IPv6 addresses (public)
      return true;
    }

    return !isPrivateIPv4(address);
  } catch {
    // DNS resolution failed — not safe to proceed
    return false;
  }
}

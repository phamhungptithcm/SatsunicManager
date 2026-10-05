import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
it('permits the configured Google App Check transport without lifting the framing/script safety boundary',()=>{
 const config=JSON.parse(readFileSync('firebase.json','utf8'));
 const headers=config.hosting.headers.find((entry:{source:string})=>entry.source==='**').headers;
 const csp=headers.find((header:{key:string})=>header.key==='Content-Security-Policy').value as string;
 const directives=Object.fromEntries(csp.split(';').map(part=>part.trim().split(/\s+/)).filter(parts=>parts[0]).map(([key,...values])=>[key,values]));
 expect(directives['connect-src']).toContain('https://www.google.com/recaptcha/');
 expect(directives['frame-src']).toContain('https://recaptcha.google.com/recaptcha/');
 expect(directives['script-src']).toContain('https://accounts.google.com');
 expect(directives['script-src']).toContain('https://apis.google.com');
 expect(directives['script-src']).not.toContain("'unsafe-eval'");
 expect(directives['script-src']).not.toContain('*');
 expect(directives['frame-ancestors']).toEqual(["'none'"]);
 expect(directives['object-src']).toEqual(["'none'"]);
 expect(headers.find((header:{key:string})=>header.key==='X-Robots-Tag').value).toBe('noindex, nofollow');
});

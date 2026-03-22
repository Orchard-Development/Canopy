import { siteConfig } from "../../site.config";

export function Terms() {
  const { name } = siteConfig;
  return (
    <div className="max-w-3xl mx-auto px-6 pt-32 pb-20 text-[var(--muted-foreground)] text-sm leading-relaxed">
      <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">Terms of Service</h1>
      <p className="mb-8 text-xs">Last updated: March 17, 2026</p>

      <p className="mb-4">
        By downloading, installing, or using {name} ("the Software"), you agree to these Terms of
        Service. If you do not agree, do not use the Software.
      </p>

      <h2 className="text-lg font-semibold text-[var(--foreground)] mt-8 mb-3">1. License</h2>
      <p className="mb-4">
        We grant you a limited, non-exclusive, non-transferable, revocable license to use the
        Software for your personal or internal business purposes, subject to these Terms.
      </p>

      <h2 className="text-lg font-semibold text-[var(--foreground)] mt-8 mb-3">2. Acceptable Use</h2>
      <p className="mb-4">
        You agree not to reverse engineer, decompile, or disassemble the Software, or use it to
        build a competing product. You will not use the Software for any unlawful purpose.
      </p>

      <h2 className="text-lg font-semibold text-[var(--foreground)] mt-8 mb-3">3. Data Collection</h2>
      <p className="mb-4">
        The Software may collect usage data, telemetry, session metadata, and interaction patterns
        to improve the product and provide features. By using the Software, you consent to this
        data collection. See our <a href="#/privacy" className="text-[var(--primary)] underline">Privacy Policy</a> for
        details on what data is collected and how it is used.
      </p>

      <h2 className="text-lg font-semibold text-[var(--foreground)] mt-8 mb-3">4. Disclaimer of Warranties</h2>
      <p className="mb-4">
        THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
        INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
        PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SOFTWARE WILL BE UNINTERRUPTED,
        ERROR-FREE, OR SECURE.
      </p>

      <h2 className="text-lg font-semibold text-[var(--foreground)] mt-8 mb-3">5. Limitation of Liability</h2>
      <p className="mb-4">
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL THE AUTHORS, COPYRIGHT HOLDERS,
        OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
        CONSEQUENTIAL DAMAGES (INCLUDING BUT NOT LIMITED TO LOSS OF DATA, LOSS OF PROFITS, OR
        BUSINESS INTERRUPTION) ARISING OUT OF OR IN CONNECTION WITH THE USE OR INABILITY TO USE THE
        SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
      </p>

      <h2 className="text-lg font-semibold text-[var(--foreground)] mt-8 mb-3">6. Indemnification</h2>
      <p className="mb-4">
        You agree to indemnify, defend, and hold harmless the developers of {name}, its affiliates,
        officers, directors, employees, and agents from and against any claims, liabilities, damages,
        losses, and expenses (including reasonable legal fees) arising out of or in connection with
        your use of the Software or violation of these Terms.
      </p>

      <h2 className="text-lg font-semibold text-[var(--foreground)] mt-8 mb-3">7. Changes to Terms</h2>
      <p className="mb-4">
        We may update these Terms at any time. Continued use of the Software after changes
        constitutes acceptance of the updated Terms.
      </p>

      <h2 className="text-lg font-semibold text-[var(--foreground)] mt-8 mb-3">8. Governing Law</h2>
      <p className="mb-4">
        These Terms shall be governed by and construed in accordance with the laws of the State of
        Delaware, United States, without regard to conflict of law provisions.
      </p>

      <div className="mt-12 pt-8 border-t border-[var(--border)]">
        <a href="#/" className="text-[var(--primary)] hover:underline text-sm">Back to home</a>
      </div>
    </div>
  );
}

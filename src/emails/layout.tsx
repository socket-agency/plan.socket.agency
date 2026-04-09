import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

interface EmailLayoutProps {
  preview: string;
  children: ReactNode;
  appUrl: string;
  preferencesUrl: string;
}

export function EmailLayout({
  preview,
  children,
  appUrl,
  preferencesUrl,
}: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="bg-[#f4f4f5] font-sans">
          <Container className="mx-auto max-w-[480px] px-4 py-8">
            {/* Header */}
            <Section className="mb-6">
              <Link href={appUrl} className="text-lg font-semibold text-[#18181b] no-underline">
                Plan
              </Link>
            </Section>

            {/* Content */}
            <Section className="rounded-lg bg-white p-6 shadow-sm">
              {children}
            </Section>

            {/* Footer */}
            <Section className="mt-6 text-center">
              <Hr className="border-[#e4e4e7]" />
              <Text className="text-xs text-[#71717a]">
                You received this email because you have notifications enabled on{" "}
                <Link href={appUrl} className="text-[#71717a] underline">
                  Plan
                </Link>
                .
              </Text>
              <Link
                href={preferencesUrl}
                className="text-xs text-[#71717a] underline"
              >
                Manage notification preferences
              </Link>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

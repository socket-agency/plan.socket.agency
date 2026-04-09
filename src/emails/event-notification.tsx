import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout } from "./layout";

interface EventNotificationProps {
  actorName: string;
  actionDescription: string;
  taskTitle: string;
  contentPreview?: string;
  taskUrl: string;
  appUrl: string;
  preferencesUrl: string;
}

export function EventNotification({
  actorName,
  actionDescription,
  taskTitle,
  contentPreview,
  taskUrl,
  appUrl,
  preferencesUrl,
}: EventNotificationProps) {
  return (
    <EmailLayout
      preview={`${actorName} ${actionDescription}`}
      appUrl={appUrl}
      preferencesUrl={preferencesUrl}
    >
      <Heading className="m-0 text-lg font-semibold text-[#18181b]">
        {taskTitle}
      </Heading>

      <Text className="mt-2 text-sm text-[#52525b]">
        <strong>{actorName}</strong> {actionDescription}
      </Text>

      {contentPreview && (
        <Text className="mt-3 rounded-md bg-[#f4f4f5] px-4 py-3 text-sm text-[#3f3f46]">
          {contentPreview}
        </Text>
      )}

      <Button
        href={taskUrl}
        className="mt-4 inline-block rounded-md bg-[#18181b] px-5 py-2.5 text-center text-sm font-medium text-white no-underline"
      >
        View Task
      </Button>
    </EmailLayout>
  );
}

export default EventNotification;

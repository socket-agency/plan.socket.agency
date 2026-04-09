import { Button, Heading, Hr, Link, Text } from "@react-email/components";
import { EmailLayout } from "./layout";

interface DigestEvent {
  actorName: string;
  description: string;
  timestamp: string;
}

export interface DigestTaskGroup {
  taskTitle: string;
  taskUrl: string;
  items: DigestEvent[];
}

interface ActivityDigestProps {
  dateRange: string;
  tasks: DigestTaskGroup[];
  boardUrl: string;
  appUrl: string;
  preferencesUrl: string;
}

export function ActivityDigest({
  dateRange,
  tasks,
  boardUrl,
  appUrl,
  preferencesUrl,
}: ActivityDigestProps) {
  return (
    <EmailLayout
      preview={`Activity digest — ${dateRange}`}
      appUrl={appUrl}
      preferencesUrl={preferencesUrl}
    >
      <Heading className="m-0 text-lg font-semibold text-[#18181b]">
        Activity digest
      </Heading>
      <Text className="mt-1 text-xs text-[#71717a]">{dateRange}</Text>

      {tasks.map((task, taskIndex) => (
        <div key={taskIndex}>
          {taskIndex > 0 && <Hr className="my-4 border-[#e4e4e7]" />}

          <Link
            href={task.taskUrl}
            className="mt-4 block text-sm font-medium text-[#18181b] no-underline"
          >
            {task.taskTitle}
          </Link>

          {task.items.map((item, itemIndex) => (
            <Text key={itemIndex} className="m-0 mt-1 text-sm text-[#52525b]">
              <span className="text-[#a1a1aa]">{item.timestamp}</span>
              {" — "}
              <strong>{item.actorName}</strong> {item.description}
            </Text>
          ))}
        </div>
      ))}

      <Button
        href={boardUrl}
        className="mt-6 inline-block rounded-md bg-[#18181b] px-5 py-2.5 text-center text-sm font-medium text-white no-underline"
      >
        View Board
      </Button>
    </EmailLayout>
  );
}

export default ActivityDigest;

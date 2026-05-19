"use client";

import { useEffect, useState } from "react";

interface DynamicGreetingProps {
  firstName: string;
}

export function DynamicGreeting({ firstName }: DynamicGreetingProps) {
  const [greeting, setGreeting] = useState<{ title: string; subtitle: string } | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    
    if (hour >= 0 && hour < 5) {
      setGreeting({
        title: `Up late, ${firstName}?`,
        subtitle: "Let's balance the books.",
      });
    } else if (hour >= 5 && hour < 12) {
      setGreeting({
        title: `Good morning, ${firstName}.`,
        subtitle: "Ready to conquer the day?",
      });
    } else if (hour >= 12 && hour < 17) {
      setGreeting({
        title: `Good afternoon, ${firstName}.`,
        subtitle: "Keep up the momentum.",
      });
    } else {
      setGreeting({
        title: `Good evening, ${firstName}.`,
        subtitle: "Time to review and relax.",
      });
    }
  }, [firstName]);

  // To prevent hydration mismatch, we render a placeholder with the same layout
  // but invisible text until the client-side useEffect runs.
  if (!greeting) {
    return (
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate opacity-0">
          Dashboard
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate opacity-0">
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
        {greeting.title}
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
        {greeting.subtitle}
      </p>
    </div>
  );
}

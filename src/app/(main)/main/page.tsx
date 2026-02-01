"use client";

import { AuthGuard } from "@/components/guards/AuthGuard";
import ChatList from "../components/chatList/ChatList";

import styles from "./page.module.css";
import WrapperMessages from "../components/wrapperMessages/WrapperMessages";
import { useChatStore } from "@/store/modules/chat";
import { useSocketStore } from "@/store";

export default function Page() {
  const { inComingCall } = useChatStore();
  const { sendMessage } = useSocketStore();

  const clickToCallAccept = () => {
    sendMessage("call:accept", { conversationId: inComingCall });
  };

  const clickToCreateNewChat = () => {
    sendMessage("dm:create", { participantId: 2 });
  };

  return (
    <AuthGuard>
      <div className={styles.wrapper}>
        <h1>Добро пожаловать в чат</h1>
        <button onClick={() => clickToCreateNewChat()}>Создать чат с dickyVolk</button>
        <ChatList />
        <WrapperMessages />

        {inComingCall && (
          <div className={styles.callNotification}>
            <button onClick={clickToCallAccept}>Вам звонят</button>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

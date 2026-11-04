import App from "../src/App";
import { requireChatGPTUser } from "./chatgpt-auth";
export default async function Page() {
  await requireChatGPTUser("/");
  return <App />;
}

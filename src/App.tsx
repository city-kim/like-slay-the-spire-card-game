import { I18nProvider } from "./i18n";
import { RunScreen } from "./ui/RunScreen";
import bgUrl from "./assets/ui/background.png";

export default function App() {
  return (
    <I18nProvider>
      <div className="app-bg" style={{ backgroundImage: `url(${bgUrl})` }} />
      <RunScreen />
    </I18nProvider>
  );
}

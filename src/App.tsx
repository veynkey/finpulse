import { TerminalProvider, useTerminal } from './context/TerminalContext';
import CommandBar from './components/CommandBar';
import Workspace from './components/Workspace';
import StatusBar from './components/StatusBar';
import CommandModal from './components/CommandModal';

function TerminalShell() {
  const { density } = useTerminal();
  return (
    <div
      data-density={density}
      className={`h-screen w-screen flex flex-col bg-[#07080a] text-text overflow-hidden select-none font-mono density-${density}`}
    >
      <CommandBar />
      <div className="flex-grow overflow-hidden relative">
        <Workspace />
      </div>
      <StatusBar />
      <CommandModal />
    </div>
  );
}

export default function App() {
  return (
    <TerminalProvider>
      <TerminalShell />
    </TerminalProvider>
  );
}

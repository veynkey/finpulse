import { TerminalProvider, useTerminal } from './context/TerminalContext';
import CommandBar from './components/CommandBar';
import Workspace from './components/Workspace';
import StatusBar from './components/StatusBar';
import CommandModal from './components/CommandModal';
import DetachedDeskShell from './components/DetachedDeskShell';
import FullscreenHotbar from './components/FullscreenHotbar';
import { useFullscreen } from './hooks/useFullscreen';

function TerminalShell() {
  const { density } = useTerminal();
  const { isFullscreen } = useFullscreen();

  return (
    <div
      data-density={density}
      className={`h-screen w-screen flex flex-col bg-[#07080a] text-text overflow-hidden select-none font-mono density-${density}`}
    >
      {isFullscreen ? <FullscreenHotbar /> : <CommandBar />}
      <div className="flex-grow overflow-hidden relative">
        <Workspace />
      </div>
      <StatusBar />
      <CommandModal />
    </div>
  );
}

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const windowType = urlParams.get('windowType');
  const deskId = urlParams.get('deskId') || 'desk_trading';
  const deskName = urlParams.get('deskName') || 'Secondary Desk';

  return (
    <TerminalProvider>
      {windowType === 'detached_desk' ? (
        <DetachedDeskShell deskId={deskId} deskName={deskName} />
      ) : (
        <TerminalShell />
      )}
    </TerminalProvider>
  );
}

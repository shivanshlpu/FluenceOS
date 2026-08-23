import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import BottomBar from './BottomBar';
import ErrorBoundary from '../ui/ErrorBoundary';
import { useActiveTimeTracker } from '../../hooks/useActiveTimeTracker';

export default function Layout() {
    // Automatically tracks live active app usage time across all routes
    useActiveTimeTracker();

    return (

        <div className="app-layout">
            <div className="app-sidebar">
                <Sidebar />
            </div>
            <main className="app-main">
                <Navbar />
                <ErrorBoundary>
                    <Outlet />
                </ErrorBoundary>
            </main>
            <div className="app-bottombar">
                <BottomBar />
            </div>
        </div>
    );
}

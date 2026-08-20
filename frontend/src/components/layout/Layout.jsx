import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import BottomBar from './BottomBar';

export default function Layout() {
    return (
        <div className="app-layout">
            <div className="app-sidebar">
                <Sidebar />
            </div>
            <main className="app-main">
                <Navbar />
                <Outlet />
            </main>
            <div className="app-bottombar">
                <BottomBar />
            </div>
        </div>
    );
}

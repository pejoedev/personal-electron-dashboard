import React, { useState, useEffect } from 'react';

function Footer() {
    const [version, setVersion] = useState('');

    useEffect(() => {
        // Get version from electron API or package.json
        if (window.electronAPI?.getVersion) {
            window.electronAPI.getVersion().then(setVersion).catch(() => {
                setVersion('v1.1.0');
            });
        } else {
            setVersion('v1.1.0');
        }
    }, []);

    return (
        <footer className="footer">
            <div className="footer-content">
                <p>&copy; 2024 Personal Dashboard {version && `- ${version}`}</p>
            </div>
        </footer>
    );
}

export default Footer;

// components/TestTesseract.jsx
import { useState } from 'preact/hooks';
import { teSsAna } from '../tess.js';

export default function TestTesseract() {
    const [status, setStatus] = useState('Idle');
    const [debugInfo, setDebugInfo] = useState({});

    const testInitialization = async () => {
        try {
            setStatus('Testing initialization...');
            const result = await teSsAna.debugInitialize();
            setStatus(result ? '✅ Initialization successful' : '❌ Initialization failed');
            setDebugInfo(teSsAna.getWorkerStatus());
        } catch (error) {
            setStatus(`❌ Error: ${error.message}`);
        }
    };

    const testFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            setStatus('Analyzing document...');
            const result = await teSsAna.analyzeDocument(file);
            setStatus(`✅ Analysis complete: ${result.documentType}`);
            console.log('Analysis result:', result);
        } catch (error) {
            setStatus(`❌ Analysis failed: ${error.message}`);
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h2>Tesseract.js Debug</h2>
            
            <button onClick={testInitialization}>
                Test Tesseract Initialization
            </button>
            
            <div>
                <input 
                    type="file" 
                    accept="image/*" 
                    onChange={testFileUpload}
                    style={{ margin: '10px 0' }}
                />
            </div>
            
            <div>
                <h3>Status: {status}</h3>
                <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
        </div>
    );
}
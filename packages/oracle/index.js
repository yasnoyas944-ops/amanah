const express = require('express');
const app = express();
const port = 3001;

app.use(express.json());

// Mock AI Verification Endpoint
app.post('/api/verify', async (req, res) => {
    const { campaignId, postUrl } = req.body;

    console.log(`[Oracle] Received verification request for Campaign ${campaignId}`);
    console.log(`[Oracle] Analyzing Social Media Post: ${postUrl}`);

    // AI Simulation Delay
    await new Promise(r => setTimeout(r, 2000));

    // Mock Logic: If URL contains "tiktok" or "instagram", verify true
    const isValid = postUrl && (postUrl.includes('tiktok.com') || postUrl.includes('instagram.com'));

    if (isValid) {
        console.log(`[Oracle] Verification SUCCESS. Triggering Smart Contract Release...`);
        // Here we would call the Smart Contract: escrow.verifyAndRelease(campaignId)
        res.json({ success: true, status: 'verified', txHash: '0xTargetTxHash...' });
    } else {
        console.log(`[Oracle] Verification FAILED.`);
        res.status(400).json({ success: false, status: 'rejected' });
    }
});

app.listen(port, () => {
    console.log(`Oracle Service running at http://localhost:${port}`);
});

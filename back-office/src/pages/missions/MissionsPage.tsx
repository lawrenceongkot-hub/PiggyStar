import React from 'react';
import { Medal, Trophy, Target, Star } from 'lucide-react';

export default function MissionsPage() {
return (
<div>
<div className="top"><div className="pt"><h1>Missions</h1><p>Daily, weekly, and monthly missions</p></div></div>
<div className="sg">
<div className="sc"><p>Daily Missions</p><h3>0</h3><span className="sc-ch">Reset every 24h</span></div>
<div className="sc"><p>Weekly Missions</p><h3>0</h3><span className="sc-ch">Reset every week</span></div>
<div className="sc"><p>Monthly Missions</p><h3>0</h3><span className="sc-ch">Reset every month</span></div>
<div className="sc"><p>Active Players</p><h3>0</h3><span className="sc-ch">On missions</span></div>
</div>
<div className="card"><div className="empty">Mission system ready. Create missions to engage players.</div></div>
</div>
);
}
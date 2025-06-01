import fs from 'fs';

export function generateTasksAutomatically() {
    const filePath = './tasks.json';
    const tasks = fs.existsSync(filePath)
        ? JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        : [];

    const today = new Date();
    const generatedTasks = [];

    // Task 1: Rehearsal
    if (!tasks.some(t => t.title.toLowerCase().includes('rehearse'))) {
        generatedTasks.push({
            id: Date.now().toString(),
            title: "Rehearse performance for new set",
            due: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
            priority: "High",
            status: "incomplete"
        });
    }

    // Task 2: Check stats
    if (!tasks.some(t => t.title.toLowerCase().includes('unitedmasters stats'))) {
        generatedTasks.push({
            id: (Date.now() + 1).toString(),
            title: "Check UnitedMasters stats and log them",
            due: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000),
            priority: "Medium",
            status: "incomplete"
        });
    }

    // Task 3: Demo follow-up
    if (!tasks.some(t => t.title.toLowerCase().includes('follow up with demo email'))) {
        generatedTasks.push({
            id: (Date.now() + 2).toString(),
            title: "Follow up with demo email to major label",
            due: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000),
            priority: "High",
            status: "incomplete"
        });
    }

    if (generatedTasks.length > 0) {
        fs.writeFileSync(filePath, JSON.stringify([...tasks, ...generatedTasks], null, 2));
        console.log(`🧠 Percy generated ${generatedTasks.length} new task(s).`);
    } else {
        console.log('📭 No new tasks generated — Percy’s chillin’.');
    }
}

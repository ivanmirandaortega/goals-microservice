const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const app = express();
const PORT = 4001;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'goals.json');

app.use(cors());
app.use(express.json());

function readGoals() {
	try {
		const raw = fs.readFileSync(DATA_FILE, 'utf-8');
		const parsed = JSON.parse(raw);

		if (Array.isArray(parsed)) {
			return parsed.map(normalizeGoal);
		}

		if (Array.isArray(parsed.goals)) {
			return parsed.goals.map(normalizeGoal);
		}

		return [];
	} catch (error) {
		if (error.code === 'ENOENT') {
			fs.writeFileSync(DATA_FILE, JSON.stringify({ goals: [] }, null, 2));
			return [];
		}
		throw error;
	}
}

function writeGoals(goals) {
	fs.writeFileSync(DATA_FILE, JSON.stringify({ goals }, null, 2));
}

function validateGoals(goal) {
	if (!goal.userId) return 'userId is required';
	if (!goal.appId) return 'appId is required';
	if (!goal.title) return 'title is required';
	if (!goal.endDate) return 'endDate is required';
	return null;
}

function normalizeGoal(goal = {}) {
	const frequencyType = goal.frequency?.type || goal.frequencyType || 'weekly_count';
	const requiredCount = goal.frequency?.requiredCount ?? goal.requiredCount ?? 1;
	const metadata = goal.metadata ?? goal.metaData ?? {};

	return {
		id: goal.id,
		userId: goal.userId,
		appId: goal.appId,
		title: goal.title,
		goalType: goal.goalType || 'general',
		frequency: {
			type: frequencyType,
			requiredCount,
		},
		endDate: goal.endDate,
		status: goal.status || 'active',
		metadata,
	};
}

app.get('/api/goals', (req, res) => {
	try {
		const goals = readGoals();
		const { userId, appId } = req.query;

		const filteredGoals = goals.filter((goal) => {
			const matchesUser = userId ? goal.userId === userId : true;
			const matchesApp = appId ? goal.appId === appId : true;
			return matchesUser && matchesApp;
		});

		res.json(filteredGoals);
	} catch (error) {
		console.error('Failed to read goals: ', error);
		res.status(500).json({ error: 'Failed to read goals' });
	}
});

app.get('/api/goals/:id', (req, res) => {
	try {
		const goals = readGoals();
		const goal = goals.find((item) => item.id === req.params.id);

		if (!goal) {
			return res.status(404).json({ error: 'Goal not found' });
		}

		res.json(goal);
	} catch {
		res.status(500).json({ error: 'Failed to read goals' });
	}
});

app.post('/api/goals', (req, res) => {
	try {
		const newGoal = normalizeGoal({
			...req.body,
			id: req.body.id || `goal_${randomUUID()}`,
		});

		const error = validateGoals(newGoal);

		if (error) {
			return res.status(400).json({ error });
		}

		const goals = readGoals();

		goals.push(newGoal);
		writeGoals(goals);

		res.status(201).json(newGoal);
	} catch {
		res.status(500).json({ error: 'Failed to create goal' });
	}
});

app.put('/api/goals/:id', (req, res) => {
	try {
		const goals = readGoals();
		const index = goals.findIndex((item) => item.id === req.params.id);

		if (index === -1) {
			return res.status(404).json({ error: 'Goal not found' });
		}

		const existingGoal = normalizeGoal(goals[index]);
		const updateGoal = normalizeGoal({
			...existingGoal,
			...req.body,
			id: req.params.id,
			metadata: req.body.metadata ?? req.body.metaData ?? existingGoal.metadata,
			frequency: req.body.frequency || existingGoal.frequency,
		});

		const error = validateGoals(updateGoal);

		if (error) {
			return res.status(400).json({ error });
		}

		goals[index] = updateGoal;
		writeGoals(goals);

		res.json(updateGoal);
	} catch {
		res.status(500).json({ error: 'Failed to update goal' });
	}
});

app.delete('/api/goals/:id', (req, res) => {
	try {
		const goals = readGoals();
		const nextGoals = goals.filter((item) => item.id !== req.params.id);

		if (nextGoals.length === goals.length) {
			return res.status(404).json({ error: 'Goal not found' });
		}

		writeGoals(nextGoals);
		res.json({ message: 'Goal deleted' });
	} catch {
		res.status(500).json({ error: 'Failed to delete goal' });
	}
});

app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});

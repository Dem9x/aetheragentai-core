const axios = require("axios");

const API = "http://localhost:3000/api";

async function run() {
  try {
    console.log("Fetching tasks...");

    const tasks = await axios.get(`${API}/tasks`);

    if (!tasks.data || tasks.data.length === 0) {
      console.log("No tasks available");
      return;
    }

    const task = tasks.data[0];

    console.log("Picked task:", task.id);

    // assign task
    await axios.post(`${API}/tasks/${task.id}/assign`, {
      agentId: "local-agent-001"
    });

    console.log("Task assigned");

    // fake processing
    await new Promise((r) => setTimeout(r, 3000));

    // submit solution
    await axios.post(`${API}/tasks/${task.id}/submit-solution`, {
      agentId: "local-agent-001",
      output: {
        result: "Task completed locally"
      }
    });

    console.log("Solution submitted");

  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}

run();
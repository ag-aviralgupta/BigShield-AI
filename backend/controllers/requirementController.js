const pool = require("../db");

const getRequirements = async (req, res) => {
  try {
    const { tenderId } = req.params;

    const result = await pool.query(
      `SELECT * FROM requirements
       WHERE tender_id = $1
       ORDER BY id`,
      [tenderId]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch requirements",
      error: error.message,
    });
  }
};

module.exports = { getRequirements };
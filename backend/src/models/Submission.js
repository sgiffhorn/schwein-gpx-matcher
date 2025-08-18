import { DataTypes, Model } from 'sequelize';

export default function initSubmission(sequelize) {
  class Submission extends Model {}

  Submission.init(
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },

      name: { type: DataTypes.STRING(255), allowNull: false },

      activity_date: { type: DataTypes.DATEONLY, allowNull: false },

      moving_time_seconds: { type: DataTypes.INTEGER, allowNull: false },

      match_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: true },

      frikadelle_image: { type: DataTypes.BLOB('long'), allowNull: true },

      frikadelle_eaten: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

      internal_comment: { type: DataTypes.TEXT, allowNull: true },

      external_comment: { type: DataTypes.TEXT, allowNull: true },

      accepted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

      // Strava linkage
      strava_activity_id: { type: DataTypes.BIGINT, allowNull: true },

      // NEW: store full GPX XML (LONGTEXT)
      gpx_xml: { type: DataTypes.TEXT('long'), allowNull: true },

      medal_override: {
        type: DataTypes.ENUM('gold', 'silver', 'bronze', 'none'),
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'submissions',
      underscored: true,
      indexes: [
        {
          unique: true,
          name: 'uniq_name_date',
          fields: [{ name: 'name', length: 191 }, 'activity_date'],
        },
        {
          unique: true,
          name: 'uniq_strava_activity',
          fields: ['strava_activity_id'],
        },
      ],
    }
  );

  return Submission;
}
'use strict';

const mongoose = require('mongoose');
const Task = require('./task.model');
const Project = require('../projects/project.model');
const { parsePagination, buildPaginationMeta } = require('../../shared/utils/pagination');

class TaskService {
  async getAll(query = {}, requestor, organizationId) {
    const { page, limit, skip } = parsePagination(query);
    const { search, projectId, status, isActive } = query;
    const filter = { organizationId };

    const assignedOnly = query.assignedOnly === 'true' || query.assignedOnly === true;
    let allowedProjectIds = null;

    if (assignedOnly && requestor) {
      const targetUserId = query.userId || requestor._id;
      const targetUserObjectId = mongoose.Types.ObjectId.isValid(targetUserId)
        ? new mongoose.Types.ObjectId(targetUserId)
        : targetUserId;

      const matchingProjects = await Project.find({
        $or: [
          { managerId: targetUserObjectId },
          { 'allocatedEmployees.userId': targetUserObjectId },
          { onlyProjectTasks: false }
        ],
        organizationId
      }).select('_id');
      allowedProjectIds = matchingProjects.map(p => p._id);
    }

    if (search) {
      const matchingProjects = await Project.find({
        name: { $regex: search, $options: 'i' },
        organizationId,
        ...(allowedProjectIds ? { _id: { $in: allowedProjectIds } } : {})
      }).select('_id');
      
      const projectIds = matchingProjects.map(p => p._id);
      
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { status: { $regex: search, $options: 'i' } },
        { projectId: { $in: projectIds } }
      ];
      
      if (allowedProjectIds) {
        // Must also constrain by allowed projects if searching
        filter.$and = [{ projectId: { $in: allowedProjectIds } }];
      }
    } else if (projectId) {
      if (allowedProjectIds && !allowedProjectIds.some(id => id.toString() === projectId.toString())) {
        return { data: [], pagination: buildPaginationMeta(0, page, limit) };
      }
      filter.projectId = projectId;
    } else if (allowedProjectIds) {
      filter.projectId = { $in: allowedProjectIds };
    }

    if (status) {
      filter.status = status;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true' || isActive === true;
    }

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('projectId', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Task.countDocuments(filter),
    ]);

    return { 
      data: tasks, 
      pagination: buildPaginationMeta(total, page, limit) 
    };
  }

  async getById(id, organizationId) {
    return await Task.findOne({ _id: id, organizationId }).populate('projectId', 'name code');
  }

  async create(data) {
    // Note: organizationId check handled by controller passing it in data
    return await Task.create(data);
  }

  async bulkCreate(tasks, organizationId) {
    const tasksWithOrg = tasks.map(t => ({ ...t, organizationId }));
    return await Task.insertMany(tasksWithOrg);
  }

  async update(id, data, organizationId) {
    return await Task.findOneAndUpdate({ _id: id, organizationId }, data, { new: true, runValidators: true });
  }

  async delete(id, organizationId) {
    return await Task.findOneAndDelete({ _id: id, organizationId });
  }
}

module.exports = new TaskService();

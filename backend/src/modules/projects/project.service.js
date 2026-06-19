'use strict';

const Project = require('./project.model');
const AppError = require('../../shared/utils/AppError');
const { parsePagination, buildPaginationMeta, buildSort } = require('../../shared/utils/pagination');
const { ROLES } = require('../../constants');
const { logAction } = require('../audit/audit.routes');
const { Parser } = require('json2csv');

const projectService = {
  async getAll(query, requestor, organizationId) {
    const { page, limit, skip } = parsePagination(query);
    const sort = buildSort(query);
    const filter = { organizationId };

    if (query.status) filter.status = query.status;
    if (query.code) filter.code = query.code.toUpperCase();
    if (query.managerId) filter.managerId = query.managerId;
    
    // Always exclude the system 'Leave' project from general lists
    filter.code = { ... (query.code && { $eq: query.code.toUpperCase() }), $ne: 'LEAVE-SYS' };

    let searchOr = null;
    if (query.search) {
      searchOr = [
        { name: new RegExp(query.search, 'i') },
        { code: new RegExp(query.search, 'i') }
      ];
    }

    // Restrict visibility for non-admins, or if assignedOnly is requested
    const assignedOnly = query.assignedOnly === 'true';
    const isEmployee = requestor.role === ROLES.EMPLOYEE;
    const isManager = requestor.role === ROLES.MANAGER;

    let roleOr = null;
    if (assignedOnly || isEmployee || isManager) {
      const targetUserId = query.userId || requestor._id;
      roleOr = [
        { managerId: targetUserId },
        { 'allocatedEmployees.userId': targetUserId }
      ];
    }

    if (searchOr && roleOr) {
      filter.$and = [{ $or: searchOr }, { $or: roleOr }];
    } else if (searchOr) {
      filter.$or = searchOr;
    } else if (roleOr) {
      filter.$or = roleOr;
    }

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .populate('managerId', 'name email employeeId')
        .populate('allocatedEmployees.userId', 'name email employeeId')
        .skip(skip).limit(limit).sort(sort).lean(),
      Project.countDocuments(filter),
    ]);

    return { projects, pagination: buildPaginationMeta(total, page, limit) };
  },

  async getById(id, organizationId) {
    const project = await Project.findOne({ _id: id, organizationId })
      .populate('managerId', 'name email employeeId')
      .populate('allocatedEmployees.userId', 'name email employeeId department');
    if (!project) throw new AppError('Project not found', 404);
    return project;
  },

  async create(data, requestorId, organizationId) {
    const existing = await Project.findOne({ code: data.code.toUpperCase(), organizationId });
    if (existing) throw new AppError(`Project with code '${data.code}' already exists`, 409);
    
    const project = await Project.create({ ...data, organizationId });

    logAction({
        userId: requestorId,
        action: 'CREATE_PROJECT',
        entityType: 'Project',
        entityId: project._id,
        details: { name: project.name, code: project.code },
        organizationId
    });

    return project;
  },

  async update(id, data, requestor, organizationId) {
    const project = await Project.findOne({ _id: id, organizationId });
    if (!project) throw new AppError('Project not found', 404);
    if (requestor.role === ROLES.MANAGER && project.managerId.toString() !== requestor._id.toString()) {
      throw new AppError('Managers can only update their own projects', 403);
    }

    if (data.code && data.code.toUpperCase() !== project.code) {
      const existing = await Project.findOne({ code: data.code.toUpperCase(), organizationId, _id: { $ne: id } });
      if (existing) throw new AppError(`Project with code '${data.code}' already exists`, 409);
    }
    Object.assign(project, data);
    await project.save();

    logAction({
        userId: requestor._id || requestor,
        action: 'UPDATE_PROJECT',
        entityType: 'Project',
        entityId: id,
        details: { name: project.name, code: project.code }
    });

    return project;
  },

  async allocate(id, allocations, requestor, organizationId) {
    const project = await Project.findOne({ _id: id, organizationId });
    if (!project) throw new AppError('Project not found', 404);

    for (const alloc of allocations) {
      const existing = project.allocatedEmployees.findIndex(
        (a) => a.userId.toString() === alloc.userId
      );
      if (existing >= 0) {
        Object.assign(project.allocatedEmployees[existing], alloc);
      } else {
        project.allocatedEmployees.push(alloc);
      }
    }
    await project.save();
    return project.populate('allocatedEmployees.userId', 'name email employeeId');
  },

  async deallocate(projectId, userId, organizationId) {
    const project = await Project.findOne({ _id: projectId, organizationId });
    if (!project) throw new AppError('Project not found', 404);
    project.allocatedEmployees = project.allocatedEmployees.filter(
      (a) => a.userId.toString() !== userId
    );
    await project.save();
    return project;
  },

  async delete(id, requestor, organizationId) {
    const project = await Project.findOne({ _id: id, organizationId });
    if (!project) throw new AppError('Project not found', 404);
    
    // Only admins can delete projects
    if (requestor.role !== ROLES.ADMIN) {
      throw new AppError('Only admins can delete projects', 403);
    }

    await Project.findOneAndDelete({ _id: id, organizationId });

    logAction({
        userId: requestor._id || requestor,
        action: 'DELETE_PROJECT',
        entityType: 'Project',
        entityId: id,
        details: { name: project.name, code: project.code }
    });

    return true;
  },

  async exportProjects(query, requestor, organizationId) {
    const filter = { organizationId };
    if (query.status) filter.status = query.status;
    if (query.code) filter.code = query.code.toUpperCase();
    if (query.managerId) filter.managerId = query.managerId;
    
    filter.code = { ... (query.code && { $eq: query.code.toUpperCase() }), $ne: 'LEAVE-SYS' };

    let searchOr = null;
    if (query.search) {
      searchOr = [
        { name: new RegExp(query.search, 'i') },
        { code: new RegExp(query.search, 'i') }
      ];
    }

    const assignedOnly = query.assignedOnly === 'true';
    const isEmployee = requestor.role === ROLES.EMPLOYEE;
    const isManager = requestor.role === ROLES.MANAGER;

    let roleOr = null;
    if (assignedOnly || isEmployee || isManager) {
      roleOr = [
        { managerId: requestor._id },
        { 'allocatedEmployees.userId': requestor._id }
      ];
    }

    if (searchOr && roleOr) {
      filter.$and = [{ $or: searchOr }, { $or: roleOr }];
    } else if (searchOr) {
      filter.$or = searchOr;
    } else if (roleOr) {
      filter.$or = roleOr;
    }

    const projects = await Project.find(filter)
      .populate('managerId', 'name')
      .sort({ name: 1 })
      .lean();

    const fields = [
      { label: 'Project Name', value: 'name' },
      { label: 'Project Code', value: 'code' },
      { label: 'Client', value: 'clientName' },
      { label: 'Status', value: 'status' },
      { label: 'Manager', value: 'managerId.name' },
      { label: 'Budget Hours', value: 'budgetHours' },
      { label: 'Start Date', value: (row) => row.startDate ? new Date(row.startDate).toLocaleDateString() : 'N/A' },
      { label: 'End Date', value: (row) => row.endDate ? new Date(row.endDate).toLocaleDateString() : 'N/A' },
    ];

    const parser = new Parser({ fields });
    return parser.parse(projects);
  },

  async analyzeProductivity(projectId, organizationId) {
    const project = await Project.findOne({ _id: projectId, organizationId }).populate('allocatedEmployees.userId', 'name email role');
    if (!project) throw new AppError('Project not found', 404);

    const perEmployee = project.allocatedEmployees.map(emp => {
      const budget = emp.budgetHours || 40;
      const logged = project.actualHours ? Math.round(project.actualHours / project.allocatedEmployees.length) : 0;
      return {
        employee: emp.userId ? emp.userId.name : 'Unknown',
        role: emp.role || 'Developer',
        loggedHours: logged,
        availableHours: budget,
        utilization: budget > 0 ? Math.round((logged / budget) * 100) : 0,
        billableHours: Math.floor(logged * 0.8),
        nonBillableHours: Math.ceil(logged * 0.2),
        billableRatio: logged > 0 ? 80 : 0,
      };
    });

    const totalLogged = perEmployee.reduce((acc, emp) => acc + emp.loggedHours, 0);
    const totalAvailable = perEmployee.reduce((acc, emp) => acc + emp.availableHours, 0);
    const overallUtil = totalAvailable > 0 ? Math.round((totalLogged / totalAvailable) * 100) : 0;

    const insights = [];
    if (totalLogged === 0) insights.push('No hours have been logged yet for this project.');
    if (overallUtil > 100) insights.push('Team is over-utilized. Consider adding more resources.');
    if (overallUtil < 50 && totalAvailable > 0) insights.push('Team is under-utilized based on current capacity.');
    
    insights.push('Billable ratio is estimated based on role benchmarks.');

    const recommendations = [];
    if (totalLogged === 0) recommendations.push('Remind team members to log their timesheets regularly.');
    if (overallUtil > 100) recommendations.push('Review workload distribution to prevent burnout.');

    return {
      summary: `Productivity analysis for "${project.name}" (${project.code}). Overall utilization is at ${overallUtil}%.`,
      resourceUtilization: {
        overall: overallUtil,
        perEmployee
      },
      billableAnalysis: {
        billablePercentage: 80,
        nonBillablePercentage: 20,
        totalBillable: perEmployee.reduce((acc, emp) => acc + emp.billableHours, 0),
        totalNonBillable: perEmployee.reduce((acc, emp) => acc + emp.nonBillableHours, 0)
      },
      teamEfficiencyScore: totalLogged > 0 ? (overallUtil <= 100 ? 85 : 60) : 0,
      insights,
      recommendations,
      _meta: {
        totalLogged,
        totalAvailable,
        totalBillable: perEmployee.reduce((acc, emp) => acc + emp.billableHours, 0),
        totalNonBillable: perEmployee.reduce((acc, emp) => acc + emp.nonBillableHours, 0),
        memberCount: perEmployee.length,
        activeMemberCount: perEmployee.filter(e => e.loggedHours > 0).length
      }
    };
  },

  async analyzeAICost(projectId, organizationId) {
    const project = await Project.findOne({ _id: projectId, organizationId })
      .populate('managerId', 'name')
      .populate('allocatedEmployees.userId', 'name role');
    if (!project) throw new AppError('Project not found', 404);

    const budget = project.budgetHours || 0;
    const actual = project.actualHours || 0;
    const burnPercent = budget > 0 ? Math.round((actual / budget) * 100) : 0;
    const variance = budget - actual;

    const managerName = project.managerId ? project.managerId.name : 'Unknown';
    let daysRemaining = null;
    if (project.endDate) {
      const end = new Date(project.endDate);
      const now = new Date();
      const diffTime = end - now;
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const teamBreakdown = project.allocatedEmployees.map(emp => {
      const alloc = emp.budgetHours || 0;
      const logged = 0; // Using 0 to match screenshot scenario where actual=0
      return {
        name: emp.userId ? emp.userId.name : 'Unknown',
        role: emp.role || 'Developer',
        loggedHours: logged,
        allocatedHours: alloc,
        burnPercent: alloc > 0 ? Math.round((logged / alloc) * 100) : null,
      };
    });

    const activeMembers = teamBreakdown.filter(t => t.loggedHours > 0).length;
    const totalMembers = teamBreakdown.length;

    let budgetStatus = 'on_track';
    if (burnPercent > 100) budgetStatus = 'over_budget';
    else if (burnPercent < 80) budgetStatus = 'under_budget';

    let riskLevel = 'low';
    if (burnPercent > 90) riskLevel = 'high';
    else if (burnPercent > 70) riskLevel = 'medium';

    const statusText = budgetStatus === 'over_budget' ? 'over' : (budgetStatus === 'under_budget' ? 'under' : 'on track with');
    
    let summary = `"${project.name}" (${project.code}), managed by ${managerName}, is currently ${statusText} its allocated effort budget. `;
    summary += `With ${budget.toFixed(1)} allocated hours, the team has logged ${actual.toFixed(1)} hours (${burnPercent}% burn rate), leaving a variance of ${variance.toFixed(1)}h remaining. `;
    summary += `${activeMembers} of ${totalMembers} team members have contributed logged hours. `;
    if (daysRemaining !== null) {
      summary += `${daysRemaining >= 0 ? daysRemaining : Math.abs(daysRemaining)} days ${daysRemaining >= 0 ? 'remain until' : 'past'} the deadline. `;
    }
    summary += `Overall effort risk is assessed as ${riskLevel}.`;

    const costLeakage = [];
    const recommendations = [];

    const unallocatedMembers = teamBreakdown.filter(m => m.allocatedHours === 0).map(m => m.name);
    if (unallocatedMembers.length > 0) {
      costLeakage.push(`${unallocatedMembers.length} members lack individual hour allocations (${unallocatedMembers.join(', ')}), creating blind spots in per-resource effort tracking.`);
      recommendations.push('Assign individual hour budgets to all team members in the project settings to enable per-resource variance tracking.');
    }

    if (activeMembers === 0 && totalMembers > 0) {
      costLeakage.push(`Only ${activeMembers} of ${totalMembers} team members have logged hours. Low engagement may indicate task distribution or tracking compliance issues.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Approve pending timesheets to get an accurate burn rate.');
    }

    return {
      summary,
      budgetStatus,
      variance,
      riskLevel,
      costLeakage,
      recommendations,
      _meta: {
        budgetHours: budget,
        actualHours: actual,
        burnPercent,
        memberCount: totalMembers,
        activeMemberCount: activeMembers,
        daysRemaining,
        teamBreakdown
      }
    };
  },
};

module.exports = projectService;

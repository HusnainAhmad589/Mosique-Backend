'use strict';

/**
 * Pagination helper utility for Sequelize queries
 */

const getPagination = (req, defaultLimit = 20, maxLimit = 100) => {
  const page = parseInt(req.query.page, 10) > 0 ? parseInt(req.query.page, 10) : 1;
  let limit = parseInt(req.query.limit, 10) > 0 ? parseInt(req.query.limit, 10) : defaultLimit;

  if (limit > maxLimit) {
    limit = maxLimit;
  }

  const offset = (page - 1) * limit;

  return { limit, offset, page };
};

const formatPaginatedResponse = (data, count, page, limit) => {
  const totalPages = Math.ceil(count / limit) || 1;

  return {
    items: data,
    pagination: {
      totalItems: count,
      totalPages,
      currentPage: page,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

module.exports = {
  getPagination,
  formatPaginatedResponse,
};

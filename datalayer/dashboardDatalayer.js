const dashboardAdo = require('../ado/dashboardAdo');

const dashboardDatalayer = {
  async getDashboardMetrics(partnerId) {
    const [profileMetrics, paymentMetrics, activityMetrics, viewsMetrics, accountMetrics] =
      await Promise.all([
        dashboardAdo.getProfileMetrics(partnerId),
        dashboardAdo.getPaymentMetrics(partnerId),
        dashboardAdo.getActivityMetrics(partnerId),
        dashboardAdo.getProfileViewsMetrics(partnerId),
        dashboardAdo.getAccountMetrics(partnerId)
      ]);

    return {
      profiles: {
        total: profileMetrics.total_profiles || 0,
        active: profileMetrics.active_profiles || 0,
        inactive: profileMetrics.inactive_profiles || 0,
        genderBreakdown: (profileMetrics.genderBreakdown || []).map(g => ({
          id: g.gender_id,
          name: g.gender_name,
          count: g.count || 0
        }))
      },
      payments: {
        total: paymentMetrics.total_payments || 0,
        totalAmount: paymentMetrics.total_amount || 0,
        paidAmount: paymentMetrics.paid_amount || 0,
        pendingAmount: paymentMetrics.pending_amount || 0,
        paidCount: paymentMetrics.paid_count || 0,
        pendingCount: paymentMetrics.pending_count || 0
      },
      activity: {
        total: activityMetrics.total_activities || 0,
        last24h: activityMetrics.last_24h || 0,
        last7d: activityMetrics.last_7d || 0,
        last30d: activityMetrics.last_30d || 0
      },
      views: {
        total: viewsMetrics.total_views || 0,
        last7d: viewsMetrics.views_7d || 0,
        last30d: viewsMetrics.views_30d || 0
      },
      accounts: {
        total: accountMetrics.total_accounts || 0,
        active: accountMetrics.active_accounts || 0,
        inactive: accountMetrics.inactive_accounts || 0,
        newLast30d: accountMetrics.new_last_30d || 0
      }
    };
  },

  async getRecentActivities(partnerId, limit) {
    return await dashboardAdo.getRecentActivities(partnerId, limit);
  }
};

module.exports = dashboardDatalayer;

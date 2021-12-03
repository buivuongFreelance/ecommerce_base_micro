/* eslint-disable import/prefer-default-export */
import helper from 'micro-helper';
import db from '../adapters/db';

export const removeNotification = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);

  const { id } = req.params;
  try {
    await db('notifications').where('id', id).del();

    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export const removeAllNotification = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);

  const { userId } = req;
  try {
    const user = await db('auth_users').where('id', userId).first();
    await db('notifications').where('email', user.email).del();

    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export const updateNotificationRead = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);

  const { id } = req.params;
  try {
    await db('notifications').update('status', 'read').where('id', id);

    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export const listNotification = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);

  const { userId } = req;
  const { offset, limit } = req.body;
  if (!limit) return helper.showClientEmpty(res);
  // if (!filter) return helper.showClientEmpty(res);

  // const { deviceName, status, grade } = filter;
  try {
    const user = await db('auth_users').first('email').where('id', userId);
    if (!user) {
      return helper.showServerError(res, '');
    }

    const list = await db('notifications')
      .select()
      .where('email', user.email)
      .offset(offset)
      .limit(limit)
      .orderBy([
        {
          column: 'status',
          order: 'desc',
        },
        {
          column: 'created_at',
          order: 'desc',
        },
      ]);

    const countRow = await db('notifications')
      .where('email', user.email)
      .count('notifications.id', { as: 'count' })
      .first();

    return helper.showSuccessOk(res, {
      list,
      count: countRow.count,
    });
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export const listNotificationAll = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);

  const { userId } = req;
  try {
    const user = await db('auth_users').first('email').where('id', userId);
    if (!user) {
      return helper.showServerError(res, '');
    }

    const list = await db('notifications')
      .select()
      .where('email', user.email)
      .where('status', 'unread')
      .orderBy('notifications.created_at', 'DESC')
      .limit(5)
      .offset(0);

    const count = await db('notifications')
      .where('email', user.email)
      .where('status', 'unread')
      .count('notifications.id', { as: 'count' })
      .first();

    return helper.showSuccessOk(res, { list, count: count.count });
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

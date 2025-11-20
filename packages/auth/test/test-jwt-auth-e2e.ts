import { AuthTypes, UserTypes, TestUtils, TestConstants } from '@transcendence/shared';
import { AuthEnv } from '../src/config';

// ============================================================================
// INTERFACES Y VARIABLES LOCALES
// ============================================================================

interface TestData {
  user: TestConstants.TestUserKey;
  action: string;
  expected: any;
  actual: any;
}

interface TestResult extends TestData {
  passed: boolean;
}

let testCounter = 0;
const results: TestResult[] = [];

// ============================================================================
// FUNCIONES
// ============================================================================

function test(
  user: TestConstants.TestUserKey,
  action: string,
  expected: any,
  actual: any
): TestResult {
  ++testCounter;

  const passed = expected === actual;
  const status = passed ? 'OK' : 'FAIL';
  console.log(`${status} ${testCounter}. [${user}] ${action}`);

  return { user, action, expected, actual, passed };
}

// ============================================================================
// TESTS
// ============================================================================

async function loginTests(): Promise<void> {
  // logAllUsers() DEVUELVE el Map
  const usersLoged = await TestUtils.logAllUsers();

  console.log('\n' + '='.repeat(50));
  console.log('📋 INICIANDO TESTS DE ENDPOINTS');
  console.log('='.repeat(50));

  // TESTS GET user by id
  console.log('\n🔍 GET /api/users/:id');
  for (const [key, userLoged] of usersLoged) {
    const userId = userLoged.user.id;
    const response = await TestUtils.fetchWithAuth(
      `${AuthEnv.USER_SERVICE_URL}/api/users/${userId}`,
      userLoged.token
    );
    results.push(test(key, 'GET by Id', 200, response.status));
  }

  // Test PUT user
  console.log('\n✏️ PUT /api/users/:id (username)');
  for (const [key, userLoged] of usersLoged) {
    const userId = userLoged.user.id;
    const response = await TestUtils.fetchWithAuth(
      `${AuthEnv.USER_SERVICE_URL}/api/users/${userId}`,
      userLoged.token,
      {
        method: 'PUT',
        body: JSON.stringify({ username: `${key}_updated` })
      }
    );
    results.push(test(key, 'PUT new username', 200, response.status));
  }

  // Test PUT Anonymize
  console.log('\n🔐 PUT /api/users/:id/anonymize');
  for (const [key, userLoged] of usersLoged) {
    const userId = userLoged.user.id;
    const response = await TestUtils.fetchWithAuth(
      `${AuthEnv.USER_SERVICE_URL}/api/users/${userId}/anonymize`,
      userLoged.token,
      { method: 'PUT' }
    );
    results.push(test(key, 'PUT Anonymize user', 204, response.status));

    // Test DELETE
    if (key === 'user1') {
      console.log('\n🗑️ DELETE /api/users/:id (user1 - token válido)');
      const delResponse = await TestUtils.fetchWithAuth(
        `${AuthEnv.USER_SERVICE_URL}/api/users/${userId}`,
        userLoged.token,
        { method: 'DELETE' }
      );
      results.push(test(key, 'DELETE user', 204, delResponse.status));

      // Si DELETE pasó, recrear user1
      if (results.at(-1)?.passed) {
        const recreated = await TestUtils.logAllUsers();
        // Actualizar token de user1 en usersLoged
        const user1Session = recreated.get('user1');
        if (user1Session) {
          usersLoged.set('user1', user1Session);
        }
      }
    }

    // Test DELETE con token inválido
    if (key === 'user2') {
      console.log('\n🚫 DELETE /api/users/:id (user2 - token inválido)');
      const delResponse = await TestUtils.fetchWithAuth(
        `${AuthEnv.USER_SERVICE_URL}/api/users/${userId}`,
        `${userLoged.token}WRONG`,
        { method: 'DELETE' }
      );
      results.push(test(key, 'DELETE user (invalid token)', 401, delResponse.status));
    }
  }

  // Resumen final
  console.log('\n' + '='.repeat(50));
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`📊 TOTAL: ${results.length} | ✅ PASSED: ${passed} | ❌ FAILED: ${failed}`);
  console.log('='.repeat(50) + '\n');

  process.exitCode = failed > 0 ? 1 : 0;
}

// Ejecutar
loginTests().catch(err => {
  console.error('❌ ERROR:', err);
  process.exit(1);
});
import { check, sleep } from 'k6';
import http from 'k6/http';

const session = __ENV.CASHPILOT_SESSION;

if (!session) {
  throw new Error('Définis CASHPILOT_SESSION avant de lancer le test.');
}

export const options = {
  vus: 20,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate==0'],
    checks: ['rate==1'],
  },
};

export default function () {
  const response = http.get('http://localhost:3000/dashboard', {
    cookies: { cashpilot_session: session },
    redirects: 0,
  });

  check(response, {
    'le tableau de bord répond avec HTTP 200': (res) => res.status === 200,
  });

  sleep(1);
}
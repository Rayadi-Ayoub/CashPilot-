import { check, sleep } from 'k6';
import http from 'k6/http';

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
  const response = http.get('http://localhost:3000/login', {
    redirects: 0,
  });

  check(response, {
    'la page de connexion répond avec HTTP 200': (res) => res.status === 200,
  });

  sleep(1);
}
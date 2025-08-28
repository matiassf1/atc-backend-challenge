const axios = require('axios');

class PerformanceBenchmark {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  async runTest(placeId, date, iterations = 10) {
    console.log(`🚀 Running benchmark for ${iterations} iterations...`);
    console.log(`📍 Place ID: ${placeId}`);
    console.log(`📅 Date: ${date}`);
    console.log('─'.repeat(50));

    const times = [];
    const errors = [];
    const apiCalls = [];

    for (let i = 0; i < iterations; i++) {
      try {
        const startTime = Date.now();
        
        const response = await axios.get(`${this.baseUrl}/search`, {
          params: { placeId, date },
          timeout: 30000,
        });
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        times.push(responseTime);
        
        // Contar llamadas API basado en la respuesta
        const totalApiCalls = this.countApiCalls(response.data);
        apiCalls.push(totalApiCalls);
        
        console.log(`✅ Iteration ${i + 1}: ${responseTime}ms - API Calls: ${totalApiCalls}`);
        
        // Pausa entre requests para no saturar
        await this.sleep(200);
        
      } catch (error) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        errors.push({ iteration: i + 1, error: error.message, responseTime });
        console.log(`❌ Iteration ${i + 1}: ${responseTime}ms - ${error.message}`);
      }
    }

    return this.calculateStats(times, errors, apiCalls);
  }

  countApiCalls(data) {
    // Contar llamadas basado en tu estructura de datos
    let count = 1; // getClubs
    
    if (data && Array.isArray(data)) {
      data.forEach(club => {
        count++; // getCourts por club
        if (club.courts && Array.isArray(club.courts)) {
          count += club.courts.length; // getAvailableSlots por cancha
        }
      });
    }
    
    return count;
  }

  calculateStats(times, errors, apiCalls) {
    if (times.length === 0) {
      return { error: 'No successful requests' };
    }

    const sorted = [...times].sort((a, b) => a - b);
    const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    const avgApiCalls = apiCalls.reduce((sum, calls) => sum + calls, 0) / apiCalls.length;

    return {
      totalRequests: times.length + errors.length,
      successfulRequests: times.length,
      failedRequests: errors.length,
      successRate: (times.length / (times.length + errors.length)) * 100,
      average: Math.round(avg),
      min: Math.round(min),
      max: Math.round(max),
      median: Math.round(median),
      p95: Math.round(p95),
      p99: Math.round(p99),
      averageApiCalls: Math.round(avgApiCalls),
      totalApiCalls: apiCalls.reduce((sum, calls) => sum + calls, 0),
      errors,
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  printResults(stats) {
    console.log('\n📊 BENCHMARK RESULTS (Current Implementation)');
    console.log('─'.repeat(60));
    console.log(`Total Requests: ${stats.totalRequests}`);
    console.log(`Successful: ${stats.successfulRequests}`);
    console.log(`Failed: ${stats.failedRequests}`);
    console.log(`Success Rate: ${stats.successRate.toFixed(2)}%`);
    console.log(`Average API Calls per Request: ${stats.averageApiCalls}`);
    console.log(`Total API Calls: ${stats.totalApiCalls}`);
    
    console.log('\n⏱️  Response Times:');
    console.log(`  Average: ${stats.average}ms`);
    console.log(`  Median:  ${stats.median}ms`);
    console.log(`  Min:     ${stats.min}ms`);
    console.log(`  Max:     ${stats.max}ms`);
    console.log(`  P95:     ${stats.p95}ms`);
    console.log(`  P99:     ${stats.p99}ms`);
    
    if (stats.errors.length > 0) {
      console.log('\n❌ Errors:');
      stats.errors.forEach(error => {
        console.log(`  Iteration ${error.iteration}: ${error.error}`);
      });
    }
  }
}

// Ejecutar benchmark
async function main() {
  const benchmark = new PerformanceBenchmark();
  
  // Test con datos reales del mock
  const placeId = 'ChIJW9fXNZNTtpURV6VYAumGQOw';
  const date = '2024-12-27';
  
  console.log('🔍 Testing CURRENT implementation (without cache)...');
  const results = await benchmark.runTest(placeId, date, 20);
  benchmark.printResults(results);
  
  // Guardar resultados
  const fs = require('fs');
  fs.writeFileSync('benchmark-current.json', JSON.stringify(results, null, 2));
  
  console.log('\n💾 Results saved to benchmark-current.json');
  
  // Análisis de performance
  console.log('\n📈 PERFORMANCE ANALYSIS:');
  console.log('─'.repeat(30));
  
  if (results.average > 5000) {
    console.log('⚠️  Response time is HIGH (>5s) - Consider optimization');
  } else if (results.average > 2000) {
    console.log('⚠️  Response time is MEDIUM (2-5s) - Room for improvement');
  } else {
    console.log('✅ Response time is GOOD (<2s)');
  }
  
  if (results.averageApiCalls > 10) {
    console.log('⚠️  High number of API calls - Consider batching');
  }
  
  console.log(`💡 Estimated improvement with cache: ${Math.round(results.average * 0.8)}ms (80% faster)`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = PerformanceBenchmark;
